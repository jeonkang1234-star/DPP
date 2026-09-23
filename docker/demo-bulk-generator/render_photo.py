# -*- coding: utf-8 -*-
"""DPP 제품 사진 렌더러 (Blender bpy, Cycles CPU).

사용: python3 render_photo.py specs.json out_dir [start] [step]
  specs.json = [{uuid, line, seed, label:{...}}, ...]
  start/step 으로 여러 프로세스가 나눠서 돌릴 수 있다.
이미 있는 파일은 건너뛴다(중단 후 재시작 가능).
"""
import json
import math
import os
import random
import sys
import time

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import label as labelmod

W, H = 640, 480
SAMPLES = 8
TMP = "/home/claude/render/tmp"
os.makedirs(TMP, exist_ok=True)


# ───────────────────────────── 공통 ─────────────────────────────
def reset():
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.05
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 3
    sc.cycles.diffuse_bounces = 2
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 2
    sc.cycles.transparent_max_bounces = 4
    sc.render.resolution_x = W
    sc.render.resolution_y = H
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 86
    try:
        sc.view_settings.view_transform = "AgX"
        sc.view_settings.look = "AgX - Punchy"
    except Exception:
        pass
    return sc


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def mat_basic(name, color, metal=0.0, rough=0.5, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    for k, v in kw.items():
        try:
            p.inputs[k].default_value = v
        except Exception:
            pass
    return m


def _nodes(m):
    return m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]


def mat_noisy(name, c1, c2, metal, rough, scale=6.0, rough2=None, bump=0.15, detail=8.0, stretch=None, wave=None, voronoi=None):
    """두 색 사이를 노이즈로 섞고 거칠기/범프를 준다 - 밀스케일, 브러시드 알루미늄, 원단 등 공용."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l, p = _nodes(m)
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    if stretch:
        mp.inputs["Scale"].default_value = stretch
    if voronoi:
        tex = n.new("ShaderNodeTexVoronoi")
        tex.inputs["Scale"].default_value = voronoi
        l.new(mp.outputs["Vector"], tex.inputs["Vector"])
        fac = tex.outputs["Distance"]
    elif wave:
        tex = n.new("ShaderNodeTexWave")
        tex.wave_type = wave.get("type", "BANDS")
        if wave.get("rings"):
            tex.wave_type = "RINGS"
        tex.bands_direction = wave.get("dir", "X") if tex.wave_type == "BANDS" else tex.bands_direction
        if tex.wave_type == "RINGS":
            tex.rings_direction = wave.get("dir", "SPHERICAL")
        tex.inputs["Scale"].default_value = wave.get("scale", 40)
        tex.inputs["Distortion"].default_value = wave.get("distortion", 2.0)
        tex.inputs["Detail"].default_value = wave.get("detail", 2.0)
        l.new(mp.outputs["Vector"], tex.inputs["Vector"])
        fac = tex.outputs["Fac"]
    else:
        tex = n.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Detail"].default_value = detail
        l.new(mp.outputs["Vector"], tex.inputs["Vector"])
        fac = tex.outputs["Fac"]
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[1].position = 0.7
    l.new(fac, ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Metallic"].default_value = metal
    if rough2 is not None:
        mr = n.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = rough
        mr.inputs["To Max"].default_value = rough2
        l.new(fac, mr.inputs["Value"])
        l.new(mr.outputs["Result"], p.inputs["Roughness"])
    else:
        p.inputs["Roughness"].default_value = rough
    if bump:
        b = n.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.02
        l.new(fac, b.inputs["Height"])
        l.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_fabric(name, color, weave=120.0, sheen=0.6, rough=0.85, knit=False, twill=False, fuzzy=0.2, color2=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l, p = _nodes(m)
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    if twill:
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(45))
    w1 = n.new("ShaderNodeTexWave")
    w1.wave_type = "BANDS"
    w1.bands_direction = "X"
    w1.inputs["Scale"].default_value = weave
    w1.inputs["Distortion"].default_value = 0.4 if not knit else 3.0
    w2 = n.new("ShaderNodeTexWave")
    w2.wave_type = "BANDS"
    w2.bands_direction = "Y" if not knit else "X"
    w2.inputs["Scale"].default_value = weave * (1.0 if not knit else 0.5)
    w2.inputs["Distortion"].default_value = 0.4
    l.new(mp.outputs["Vector"], w1.inputs["Vector"])
    l.new(mp.outputs["Vector"], w2.inputs["Vector"])
    mx = n.new("ShaderNodeMath")
    mx.operation = "MULTIPLY"
    l.new(w1.outputs["Fac"], mx.inputs[0])
    l.new(w2.outputs["Fac"], mx.inputs[1])
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    l.new(mp.outputs["Vector"], nz.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    c = color
    c2 = color2 or tuple(max(0, x * 0.78) for x in c)
    ramp.color_ramp.elements[0].color = (*c2, 1)
    ramp.color_ramp.elements[1].color = (*c, 1)
    l.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough
    p.inputs["Sheen Weight"].default_value = sheen * 0.25
    p.inputs["Sheen Roughness"].default_value = 0.5
    try:
        p.inputs["Sheen Tint"].default_value = (*color, 1)
    except Exception:
        pass
    p.inputs["Specular IOR Level"].default_value = 0.2
    b = n.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.35 + fuzzy
    b.inputs["Distance"].default_value = 0.004
    l.new(mx.outputs["Value"], b.inputs["Height"])
    l.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_image(name, path, rough=0.5, alpha=False, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l, p = _nodes(m)
    t = n.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path)
    l.new(t.outputs["Color"], p.inputs["Base Color"])
    if alpha:
        l.new(t.outputs["Alpha"], p.inputs["Alpha"])
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    return m


def box(name, size, loc=(0, 0, 0), mat=None, bevel=0.0, seg=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new("bv", "BEVEL")
        md.width = bevel
        md.segments = seg
        md.limit_method = "NONE"
    if mat:
        ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth() if bevel > 0 else None
    return ob


def cyl(name, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, verts=48, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.object
    ob.name = name
    if mat:
        ob.data.materials.append(mat)
    if smooth:
        bpy.ops.object.shade_smooth()
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
        except Exception:
            pass
    return ob


def tube(name, r_out, r_in, depth, loc=(0, 0, 0), rot=(0, 0, 0), mats=None, verts=96):
    """속이 빈 원통(코일, 원단 지관 등). mats=[바깥면, 옆면(마구리), 안쪽면]."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ring_o0 = [bm.verts.new((r_out * math.cos(a), r_out * math.sin(a), -depth / 2)) for a in [2 * math.pi * i / verts for i in range(verts)]]
    ring_o1 = [bm.verts.new((v.co.x, v.co.y, depth / 2)) for v in ring_o0]
    ring_i0 = [bm.verts.new((r_in * math.cos(a), r_in * math.sin(a), -depth / 2)) for a in [2 * math.pi * i / verts for i in range(verts)]]
    ring_i1 = [bm.verts.new((v.co.x, v.co.y, depth / 2)) for v in ring_i0]
    for i in range(verts):
        j = (i + 1) % verts
        f = bm.faces.new([ring_o0[i], ring_o0[j], ring_o1[j], ring_o1[i]]); f.material_index = 0; f.smooth = True
        f = bm.faces.new([ring_i1[i], ring_i1[j], ring_i0[j], ring_i0[i]]); f.material_index = 2; f.smooth = True
        f = bm.faces.new([ring_o1[i], ring_o1[j], ring_i1[j], ring_i1[i]]); f.material_index = 1
        f = bm.faces.new([ring_i0[i], ring_i0[j], ring_o0[j], ring_o0[i]]); f.material_index = 1
    bm.to_mesh(me)
    ob = link(bpy.data.objects.new(name, me))
    ob.location = loc
    ob.rotation_euler = rot
    for mm in (mats or []):
        ob.data.materials.append(mm)
    return ob


def extrude_profile(name, pts, length, mat=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z += length
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    ob = link(bpy.data.objects.new(name, me))
    ob.location = loc
    ob.rotation_euler = rot
    md = ob.modifiers.new("bv", "BEVEL")
    md.width = 0.002
    md.segments = 1
    if mat:
        ob.data.materials.append(mat)
    return ob


def decal(name, img_path, size, loc, rot, rough=0.45, alpha=False):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (size[0], size[1], 1)
    ob.data.materials.append(mat_image(name + "_m", img_path, rough=rough, alpha=alpha))
    return ob


# ───────────────────────────── 배경/조명/카메라 ─────────────────────────────
BACKDROPS = {
    "studio_light": ((0.62, 0.63, 0.64), (0.66, 0.67, 0.68)),
    "studio_warm": ((0.62, 0.58, 0.52), (0.66, 0.62, 0.56)),
    "studio_cool": ((0.42, 0.47, 0.53), (0.46, 0.51, 0.57)),
    "studio_dark": ((0.10, 0.11, 0.12), (0.22, 0.23, 0.25)),
    "concrete": ((0.30, 0.30, 0.29), (0.38, 0.38, 0.37)),
    "wood": ((0.36, 0.22, 0.12), (0.55, 0.37, 0.22)),
}


def backdrop(kind, rnd, extent=30):
    c1, c2 = BACKDROPS[kind]
    if kind == "concrete":
        m = mat_noisy("floor", c1, c2, 0.0, 0.75, scale=rnd.uniform(30, 60), rough2=0.95, bump=0.25, detail=10)
    elif kind == "wood":
        m = mat_noisy("floor", c1, c2, 0.0, 0.45, rough2=0.6, bump=0.1, wave={"type": "BANDS", "dir": "X", "scale": 6, "distortion": 9})
    else:
        m = mat_basic("floor", tuple((a + b) / 2 for a, b in zip(c1, c2)), 0.0, 0.7)
    # 스튜디오: 바닥에서 뒤로 휘어 올라가는 사이클로라마
    me = bpy.data.meshes.new("cyc")
    bm = bmesh.new()
    prof = []
    for i in range(12):
        a = (math.pi / 2) * i / 11
        prof.append((-(math.sin(a) * 4) - 0.0, 4 - math.cos(a) * 4))
    ys = [extent * 0.8] + [p[0] - extent * 0.2 for p in prof] + [-(extent * 0.2) - 4]
    zs = [0] + [p[1] for p in prof] + [extent * 0.6]
    prev = None
    for y, z in zip(ys, zs):
        a = bm.verts.new((-extent, -y, z))
        b = bm.verts.new((extent, -y, z))
        if prev:
            bm.faces.new([prev[0], prev[1], b, a])
        prev = (a, b)
    bm.to_mesh(me)
    ob = link(bpy.data.objects.new("backdrop", me))
    ob.data.materials.append(m)
    ob.rotation_euler = (0, 0, math.radians(rnd.uniform(-20, 20)))
    for p in ob.data.polygons:
        p.use_smooth = True
    w = bpy.data.worlds.new("w")
    bpy.context.scene.world = w
    w.use_nodes = True
    bgn = w.node_tree.nodes["Background"]
    bgn.inputs[0].default_value = (0.85, 0.87, 0.9, 1) if kind != "studio_dark" else (0.05, 0.05, 0.06, 1)
    bgn.inputs[1].default_value = rnd.uniform(0.12, 0.25) if kind != "studio_dark" else 0.05
    return ob


def lights(rnd, center, span, dark=False):
    k = 1.0 if not dark else 1.3
    s = max(span, 0.3)
    def area(loc, energy, size, color=(1, 1, 1)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        L = bpy.context.object
        L.data.energy = energy
        L.data.size = size
        L.data.color = color
        d = Vector(center) - Vector(loc)
        L.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return L
    az = rnd.uniform(-70, -20)
    key = Vector((math.cos(math.radians(az)), math.sin(math.radians(az)), 0.9)).normalized() * s * 3.2
    area(Vector(center) + key, 260 * k * s * s, s * 2.2, (1.0, rnd.uniform(0.95, 1.0), rnd.uniform(0.9, 0.98)))
    fill = Vector((math.cos(math.radians(az + 120)), math.sin(math.radians(az + 120)), 0.5)).normalized() * s * 3.5
    area(Vector(center) + fill, 80 * k * s * s, s * 3.0, (rnd.uniform(0.9, 0.97), 0.97, 1.0))
    rim = Vector((math.cos(math.radians(az + 200)), math.sin(math.radians(az + 200)), 1.1)).normalized() * s * 3.0
    area(Vector(center) + rim, 160 * k * s * s, s * 1.5)


def camera(rnd, objs, elev=(14, 32), az=(20, 70), fit=1.18, lens=None):
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    bpy.context.view_layer.update()
    for ob in objs:
        for c in ob.bound_box:
            w = ob.matrix_world @ Vector(c)
            mins = Vector(map(min, mins, w))
            maxs = Vector(map(max, maxs, w))
    center = (mins + maxs) / 2
    radius = (maxs - mins).length / 2
    lens = lens or rnd.choice([50, 60, 70, 85])
    e = math.radians(rnd.uniform(*elev))
    a = math.radians(rnd.uniform(*az) * rnd.choice([1, -1]))
    fov = 2 * math.atan(36 / 2 / lens) * (H / W)
    dist = radius / math.sin(fov / 2) * fit * rnd.uniform(0.92, 1.08)
    loc = center + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.data.lens = lens
    cam.data.clip_end = 500
    d = center - loc
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    return center, radius


def bounds(objs):
    bpy.context.view_layer.update()
    zmin = 1e9
    for ob in objs:
        for c in ob.bound_box:
            zmin = min(zmin, (ob.matrix_world @ Vector(c)).z)
    return zmin


def drop_to_floor(objs):
    z = bounds(objs)
    for ob in objs:
        if ob.parent is None:
            ob.location.z -= z


# ───────────────────────────── 철강 ─────────────────────────────
STEEL_SCALE = {  # (색1, 색2, 금속, 거칠기1, 거칠기2)
    "mill": ((0.035, 0.038, 0.045), (0.09, 0.095, 0.105), 0.55, 0.5, 0.8),
    "rusty": ((0.11, 0.05, 0.025), (0.08, 0.075, 0.075), 0.35, 0.6, 0.9),
    "bright": ((0.45, 0.46, 0.48), (0.6, 0.61, 0.63), 1.0, 0.14, 0.3),
    "galv": ((0.5, 0.52, 0.54), (0.68, 0.69, 0.71), 1.0, 0.2, 0.42),
    "primer": ((0.2, 0.035, 0.02), (0.26, 0.05, 0.03), 0.0, 0.6, 0.8),
}


def steel_mat(kind, rnd):
    c1, c2, mt, r1, r2 = STEEL_SCALE[kind]
    jit = rnd.uniform(0.9, 1.1)
    c1 = tuple(min(1, x * jit) for x in c1)
    if kind == "galv":
        return mat_noisy("galv", c1, c2, mt, r1, rough2=r2, bump=0.05, voronoi=rnd.uniform(18, 35))
    return mat_noisy("steel_" + kind, c1, c2, mt, r1, scale=rnd.uniform(3, 9), rough2=r2, bump=0.12, detail=12)


def wood_mat():
    return mat_noisy("wood", (0.42, 0.28, 0.16), (0.62, 0.46, 0.29), 0, 0.7, rough2=0.85, bump=0.2,
                     wave={"type": "BANDS", "dir": "X", "scale": 4, "distortion": 12})


def dunnage(objs_span_x, y_positions, z, length=1.4, thick=0.1):
    wm = wood_mat()
    out = []
    for y in y_positions:
        out.append(box("dun", (length, thick, thick), loc=(0, y, z + thick / 2), mat=wm, bevel=0.005))
    return out


def parse_h(size):
    s = size.replace("H", "").split("×")
    h, b, tw, tf = [float(x) / 1000 for x in s]
    return h, b, tw, tf


def build_section(spec, rnd, lab):
    h, b, tw, tf = parse_h(spec.get("size", "H300×300×10×15"))
    L = rnd.uniform(1.6, 2.4)
    m = steel_mat(rnd.choice(["mill", "mill", "rusty", "primer"]), rnd)
    pts = [(-b / 2, -h / 2), (b / 2, -h / 2), (b / 2, -h / 2 + tf), (tw / 2, -h / 2 + tf), (tw / 2, h / 2 - tf), (b / 2, h / 2 - tf),
           (b / 2, h / 2), (-b / 2, h / 2), (-b / 2, h / 2 - tf), (-tw / 2, h / 2 - tf), (-tw / 2, -h / 2 + tf), (-b / 2, -h / 2 + tf)]
    rows, cols = rnd.choice([(2, 3), (3, 3), (3, 4), (2, 4), (4, 4)])
    objs = []
    gap = 0.004
    for r in range(rows):
        for c in range(cols):
            ob = extrude_profile("beam", pts, L, m, loc=(-L / 2, (c - (cols - 1) / 2) * (b + gap), 0.12 + h / 2 + r * (h + gap)),
                                 rot=(0, math.pi / 2, 0))
            objs.append(ob)
    # 결속 밴드
    band = mat_basic("band", (0.25, 0.27, 0.3), 1, 0.35)
    wth = cols * (b + gap) + 0.02
    hh = rows * (h + gap) + 0.02
    for x in (-L * 0.3, L * 0.3):
        for dz in (0, hh):
            objs.append(box("band", (0.035, wth, 0.004), loc=(x, 0, 0.12 + dz), mat=band))
        for dy in (-wth / 2, wth / 2):
            objs.append(box("band", (0.035, 0.004, hh), loc=(x, dy, 0.12 + hh / 2), mat=band))
    objs += dunnage(0, [-L * 0.32, L * 0.32], 0, length=0.12, thick=0.12) if False else []
    wm = wood_mat()
    for x in (-L * 0.38, L * 0.38):
        objs.append(box("dun", (0.12, wth + 0.25, 0.12), loc=(x, 0, 0.06), mat=wm, bevel=0.004))
    # 마구리 라벨(태그)
    objs.append(decal("tag", lab, (min(0.32, wth * 0.8), min(0.2, wth * 0.5)), (L / 2 + 0.003, 0, 0.12 + hh * 0.5),
                      (math.pi / 2, 0, math.pi / 2)))
    return objs


def build_plate(spec, rnd, lab):
    t = rnd.uniform(0.02, 0.06)
    Wd, Ln = rnd.uniform(1.2, 1.6), rnd.uniform(2.0, 2.8)
    n = rnd.randint(3, 7)
    objs = []
    kind = rnd.choice(["mill", "mill", "rusty", "primer"])
    for i in range(n):
        m = steel_mat(kind, rnd)
        objs.append(box("plate", (Ln, Wd, t), loc=(rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), 0.14 + t / 2 + i * (t + 0.001)),
                        mat=m, bevel=0.002, seg=1, rot=(0, 0, math.radians(rnd.uniform(-1.5, 1.5)))))
    wm = wood_mat()
    for x in (-Ln * 0.35, 0, Ln * 0.35):
        objs.append(box("dun", (0.12, Wd + 0.3, 0.14), loc=(x, 0, 0.07), mat=wm, bevel=0.004))
    top = 0.14 + n * (t + 0.001)
    objs.append(decal("tag", lab, (0.42, 0.26), (Ln * 0.25, -Wd * 0.2, top + 0.001), (0, 0, math.radians(rnd.uniform(-8, 8)))))
    return objs


def build_coil(spec, rnd, lab, kind):
    ro = rnd.uniform(0.75, 1.0)
    ri = 0.305 if kind != "wire" else 0.45
    w = rnd.uniform(1.0, 1.5)
    finish = {"HR_COIL": rnd.choice(["mill", "mill", "rusty"]), "CR_COIL": "bright", "HDG_COIL": "galv"}[spec["line"]]
    outer = steel_mat(finish, rnd)
    side = mat_noisy("coil_side", (0.12, 0.13, 0.15) if finish != "galv" else (0.5, 0.52, 0.55), (0.35, 0.36, 0.38) if finish != "galv" else (0.75, 0.76, 0.78),
                     0.9, 0.35, rough2=0.6, bump=0.3, wave={"rings": True, "dir": "Z", "scale": 60, "distortion": 0.5})
    objs = []
    n = rnd.choice([1, 1, 2])
    for i in range(n):
        y = (i - (n - 1) / 2) * (w + 0.35)
        c = tube("coil", ro, ri, w, loc=(0, y, ro + 0.08), rot=(math.pi / 2, 0, 0), mats=[outer, side, side])
        objs.append(c)
        band = mat_basic("band", (0.22, 0.24, 0.27), 1, 0.3)
        for dy in (-w * 0.25, w * 0.25):
            b = tube("band", ro + 0.004, ro - 0.001, 0.032, loc=(0, y + dy, ro + 0.08), rot=(math.pi / 2, 0, 0), mats=[band, band, band])
            objs.append(b)
        # 받침(새들)
        wm = wood_mat()
        for dx in (-ro * 0.62, ro * 0.62):
            objs.append(box("saddle", (0.18, w + 0.2, 0.26), loc=(dx, y, 0.13), mat=wm, bevel=0.01))
        if i == 0:
            objs.append(decal("tag", lab, (0.36, 0.22), (0, y - w / 2 - 0.002, ro + 0.08 + ro * 0.55), (math.pi / 2, 0, 0)))
    return objs


def build_wire(spec, rnd, lab):
    ro, ri = rnd.uniform(0.6, 0.7), rnd.uniform(0.38, 0.45)
    h = rnd.uniform(0.9, 1.3)
    rr = rnd.uniform(0.005, 0.009)
    m = steel_mat(rnd.choice(["mill", "rusty", "bright"]), rnd)
    objs = []
    loops = int(h / (rr * 2.2))
    loops = min(loops, 110)
    curve = bpy.data.curves.new("wire", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = rr
    curve.bevel_resolution = 2
    for i in range(loops):
        sp = curve.splines.new("NURBS")
        k = 16
        sp.points.add(k - 1)
        rad = rnd.uniform(ri + rr, ro - rr)
        cx, cy = rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03)
        z = rr + i * h / loops
        for j in range(k):
            a = 2 * math.pi * j / k
            sp.points[j].co = (cx + rad * math.cos(a), cy + rad * math.sin(a), z + rnd.uniform(-rr, rr) * 0.3, 1)
        sp.use_cyclic_u = True
        sp.order_u = 4
    ob = link(bpy.data.objects.new("wirecoil", curve))
    ob.data.materials.append(m)
    ob.location = (0, 0, 0.12)
    objs.append(ob)
    band = mat_basic("band", (0.22, 0.24, 0.27), 1, 0.3)
    for a in (0, 90, 180, 270):
        ang = math.radians(a + 20)
        objs.append(box("band", (ro - ri + 0.04, 0.03, 0.004), loc=((ro + ri) / 2 * math.cos(ang), (ro + ri) / 2 * math.sin(ang), 0.12 + h + 0.01),
                        mat=band, rot=(0, 0, ang)))
    wm = wood_mat()
    objs.append(box("pallet", (ro * 2.2, ro * 2.2, 0.12), loc=(0, 0, 0.06), mat=wm, bevel=0.005))
    objs.append(decal("tag", lab, (0.3, 0.19), (ro * 0.72, -ro * 0.72, 0.12 + h + 0.02), (0, 0, math.radians(45))))
    return objs


def build_bars(spec, rnd, lab, rebar):
    L = rnd.uniform(1.4, 2.0)
    r = rnd.uniform(0.01, 0.016) if rebar else rnd.uniform(0.03, 0.05)
    n_side = rnd.randint(9, 13) if rebar else rnd.randint(4, 6)
    finish = "rusty" if rebar and rnd.random() < 0.5 else "mill"
    if rebar:
        m = mat_noisy("rebar", (0.14, 0.12, 0.11), (0.3, 0.26, 0.22), 0.7, 0.55, rough2=0.85, bump=0.6,
                      wave={"type": "BANDS", "dir": "Z", "scale": 18, "distortion": 0.3}, stretch=(1, 1, 6))
    else:
        m = steel_mat(finish, rnd)
    endcol = rnd.choice([(0.9, 0.75, 0.05), (0.8, 0.1, 0.08), (0.1, 0.4, 0.8), (0.1, 0.6, 0.2), (0.95, 0.95, 0.95)])
    endm = mat_basic("paint", endcol, 0, 0.5)
    objs = []
    for i in range(n_side):
        for j in range(n_side - (i % 2)):
            y = (j - (n_side - 1) / 2) * r * 2.02 + (r if i % 2 else 0)
            z = 0.14 + r + i * r * 1.75
            dx = rnd.uniform(-0.03, 0.03)
            objs.append(cyl("bar", r, L, loc=(dx, y, z), rot=(0, math.pi / 2, 0), mat=m, verts=24))
            objs.append(cyl("end", r * 0.999, 0.004, loc=(dx + L / 2 + 0.002, y, z), rot=(0, math.pi / 2, 0), mat=endm, verts=24))
    wm = wood_mat()
    span = n_side * r * 2.2
    for x in (-L * 0.35, L * 0.35):
        objs.append(box("dun", (0.1, span + 0.25, 0.14), loc=(x, 0, 0.07), mat=wm, bevel=0.004))
    tie = mat_basic("tie", (0.2, 0.2, 0.22), 1, 0.4)
    top = 0.14 + n_side * r * 1.8
    for x in (-L * 0.25, 0, L * 0.25):
        t = tube("tie", span / 2 + 0.01, span / 2, 0.012, loc=(x, 0, 0.14 + (top - 0.14) / 2), rot=(0, math.pi / 2, 0), mats=[tie, tie, tie], verts=32)
        t.scale = (1, 1, 1)
        t.scale.x = (top - 0.14) / span + 0.05
        objs.append(t)
    objs.append(decal("tag", lab, (0.26, 0.16), (L / 2 + 0.03, 0, top + 0.1), (math.pi / 2, 0, math.pi / 2)))
    return objs


# ───────────────────────────── 배터리 ─────────────────────────────
def alu(rnd, dark=False):
    c = (0.55, 0.57, 0.6) if not dark else (0.18, 0.19, 0.21)
    return mat_noisy("alu", c, tuple(min(1, x * 1.15) for x in c), 1.0, 0.25, rough2=0.42, bump=0.03, stretch=(1, 60, 1))


def plastic(color, rough=0.45):
    return mat_basic("plastic", color, 0, rough, **{"Coat Weight": 0.15})


HV_ORANGE = (0.95, 0.35, 0.03)
COPPER = (0.85, 0.45, 0.25)


def build_ev_pack(spec, rnd, lab):
    L, Wd, Hh = rnd.uniform(1.9, 2.3), rnd.uniform(1.3, 1.55), rnd.uniform(0.13, 0.17)
    top = alu(rnd, dark=rnd.random() < 0.5) if rnd.random() < 0.7 else plastic((0.12, 0.12, 0.13), 0.55)
    objs = [box("tray", (L, Wd, Hh), loc=(0, 0, Hh / 2 + 0.05), mat=top, bevel=0.025)]
    # 상판 리브
    rib = alu(rnd)
    for i in range(rnd.randint(3, 6)):
        x = -L * 0.35 + i * L * 0.7 / 5
        objs.append(box("rib", (0.05, Wd * 0.8, 0.012), loc=(x, 0, Hh + 0.055), mat=rib, bevel=0.004))
    # 플랜지 + 볼트
    fl = mat_basic("flange", (0.2, 0.21, 0.23), 1, 0.35)
    objs.append(box("flange", (L + 0.08, Wd + 0.08, 0.012), loc=(0, 0, 0.056), mat=fl, bevel=0.01))
    bolt = mat_basic("bolt", (0.7, 0.7, 0.72), 1, 0.2)
    for i in range(10):
        x = -L / 2 - 0.02 + i * (L + 0.04) / 9
        for y in (-Wd / 2 - 0.02, Wd / 2 + 0.02):
            objs.append(cyl("bolt", 0.012, 0.012, loc=(x, y, 0.068), mat=bolt, verts=12))
    # HV 커넥터
    hv = plastic(HV_ORANGE, 0.35)
    objs.append(box("hv", (0.14, 0.09, 0.08), loc=(L / 2 + 0.06, -Wd * 0.2, Hh * 0.6 + 0.05), mat=hv, bevel=0.012))
    objs.append(box("lv", (0.08, 0.06, 0.05), loc=(L / 2 + 0.045, Wd * 0.2, Hh * 0.6 + 0.05), mat=plastic((0.05, 0.05, 0.05)), bevel=0.01))
    objs.append(box("stand", (L * 0.95, Wd * 0.9, 0.05), loc=(0, 0, 0.025), mat=wood_mat(), bevel=0.004))
    objs.append(decal("label", lab, (0.42, 0.26), (-L * 0.2, Wd * 0.1, Hh + 0.0505 + 0.013), (0, 0, 0)))
    return objs


def build_prismatic_cells(spec, rnd, lab, n=None):
    L, Wd, Hh = 0.148, rnd.choice([0.027, 0.05, 0.08]), rnd.choice([0.095, 0.105, 0.125])
    n = n or rnd.randint(3, 8)
    wrap = plastic(rnd.choice([(0.05, 0.25, 0.65), (0.08, 0.08, 0.09), (0.55, 0.57, 0.6), (0.1, 0.45, 0.35)]), 0.3)
    can = alu(rnd)
    objs = []
    for i in range(n):
        y = (i - (n - 1) / 2) * (Wd + 0.003)
        objs.append(box("cell", (L, Wd, Hh), loc=(0, y, Hh / 2), mat=wrap if rnd.random() < 0.85 else can, bevel=0.003))
        objs.append(box("lid", (L * 0.98, Wd * 0.98, 0.003), loc=(0, y, Hh + 0.0015), mat=can))
        objs.append(box("t+", (0.03, Wd * 0.55, 0.008), loc=(-L * 0.32, y, Hh + 0.006), mat=mat_basic("al", (0.8, 0.8, 0.82), 1, 0.2)))
        objs.append(box("t-", (0.03, Wd * 0.55, 0.008), loc=(L * 0.32, y, Hh + 0.006), mat=mat_basic("cu", COPPER, 1, 0.25)))
        objs.append(cyl("vent", Wd * 0.18, 0.001, loc=(0, y, Hh + 0.0035), mat=mat_basic("vent", (0.15, 0.15, 0.15), 1, 0.3), verts=16))
    objs.append(decal("label", lab, (0.1, 0.062), (0, -(n - 1) / 2 * (Wd + 0.003) - Wd / 2 - 0.0008, Hh * 0.5), (math.pi / 2, 0, 0)))
    return objs


def build_pouch(spec, rnd, lab):
    L, Wd, t = rnd.choice([(0.32, 0.1, 0.011), (0.35, 0.1, 0.012), (0.3, 0.1, 0.01)])
    n = rnd.randint(3, 6)
    film = mat_noisy("pouch", (0.66, 0.67, 0.7), (0.8, 0.81, 0.83), 1.0, 0.18, rough2=0.35, bump=0.08, scale=18)
    objs = []
    for i in range(n):
        z = t / 2 + i * (t + 0.001)
        rot = math.radians(rnd.uniform(-4, 4) + i * rnd.uniform(0, 6))
        objs.append(box("pouch", (L, Wd, t), loc=(0, 0, z), mat=film, bevel=t * 0.45, seg=4, rot=(0, 0, rot)))
        objs.append(box("seal", (L + 0.012, Wd + 0.012, 0.0006), loc=(0, 0, z), mat=film, rot=(0, 0, rot)))
        for sgn, col in ((-1, (0.82, 0.82, 0.84)), (1, COPPER)):
            tx = sgn * Wd * 0.25
            objs.append(box("tab", (0.03, 0.045, 0.0004), loc=(L / 2 + 0.02, tx, z), mat=mat_basic("tab", col, 1, 0.2), rot=(0, 0, rot)))
    objs.append(decal("label", lab, (0.1, 0.062), (-L * 0.15, 0, n * (t + 0.001) + 0.0003), (0, 0, math.radians(rnd.uniform(-5, 5)))))
    return objs


def build_module(spec, rnd, lab, ess=False):
    L, Wd, Hh = (rnd.uniform(0.4, 0.62), rnd.uniform(0.15, 0.36), rnd.uniform(0.11, 0.16)) if not ess else (0.62, 0.44, 0.13)
    body = alu(rnd, dark=rnd.random() < 0.4) if not ess else mat_basic("ess", rnd.choice([(0.08, 0.08, 0.09), (0.8, 0.8, 0.8), (0.12, 0.2, 0.32)]), 0.2, 0.4)
    objs = [box("body", (L, Wd, Hh), loc=(0, 0, Hh / 2), mat=body, bevel=0.006)]
    if not ess:
        endp = mat_basic("endplate", (0.25, 0.26, 0.28), 1, 0.35)
        for x in (-L / 2 - 0.005, L / 2 + 0.005):
            objs.append(box("end", (0.01, Wd + 0.01, Hh + 0.01), loc=(x, 0, Hh / 2), mat=endp, bevel=0.002))
        bus = mat_basic("bus", COPPER if rnd.random() < 0.5 else (0.75, 0.76, 0.78), 1, 0.25)
        ncell = rnd.randint(6, 12)
        for i in range(ncell):
            x = -L / 2 + (i + 0.5) * L / ncell
            objs.append(box("busbar", (L / ncell * 0.8, 0.03, 0.004), loc=(x, Wd * 0.3 * (1 if i % 2 else -1), Hh + 0.002), mat=bus))
        objs.append(box("cover", (L * 0.5, Wd * 0.25, 0.02), loc=(0, 0, Hh + 0.01), mat=plastic((0.05, 0.05, 0.06)), bevel=0.004))
    else:
        # 19인치 랙 모듈 전면: 손잡이, 단자, LED
        fp = mat_basic("front", (0.1, 0.1, 0.11), 0.3, 0.4)
        objs.append(box("front", (0.012, Wd + 0.04, Hh), loc=(L / 2 + 0.006, 0, Hh / 2), mat=fp, bevel=0.003))
        hdl = mat_basic("handle", (0.7, 0.71, 0.73), 1, 0.25)
        for y in (-Wd / 2 - 0.005, Wd / 2 + 0.005):
            objs.append(box("handle", (0.03, 0.02, Hh * 0.7), loc=(L / 2 + 0.03, y, Hh / 2), mat=hdl, bevel=0.005))
        objs.append(box("pos", (0.02, 0.03, 0.03), loc=(L / 2 + 0.02, -Wd * 0.2, Hh * 0.5), mat=plastic((0.8, 0.1, 0.08))))
        objs.append(box("neg", (0.02, 0.03, 0.03), loc=(L / 2 + 0.02, Wd * 0.0, Hh * 0.5), mat=plastic((0.05, 0.05, 0.05))))
        led = mat_basic("led", (0.1, 1.0, 0.3), 0, 0.3, **{"Emission Color": (0.1, 1.0, 0.3, 1), "Emission Strength": 6.0})
        for k in range(4):
            objs.append(cyl("led", 0.004, 0.003, loc=(L / 2 + 0.0135, Wd * 0.18 + k * 0.014, Hh * 0.75), rot=(0, math.pi / 2, 0), mat=led, verts=10))
    objs.append(decal("label", lab, (0.14, 0.087), (0, -Wd / 2 - 0.0012, Hh * 0.5), (math.pi / 2, 0, 0)))
    return objs


def build_ess_rack(spec, rnd, lab):
    n = rnd.randint(7, 10)
    mh = 0.13
    Wd, D = 0.6, 0.72
    Hh = n * (mh + 0.012) + 0.35
    cab = mat_basic("cab", rnd.choice([(0.85, 0.86, 0.87), (0.1, 0.1, 0.11), (0.18, 0.28, 0.42)]), 0.2, 0.45)
    objs = [box("frame", (D, Wd + 0.04, Hh), loc=(0, 0, Hh / 2 + 0.1), mat=cab, bevel=0.01)]
    fp = mat_basic("modfront", (0.08, 0.08, 0.09), 0.3, 0.45)
    hdl = mat_basic("handle", (0.7, 0.71, 0.73), 1, 0.25)
    led = mat_basic("led", (0.1, 1.0, 0.3), 0, 0.3, **{"Emission Color": (0.1, 1.0, 0.3, 1), "Emission Strength": 6.0})
    for i in range(n):
        z = 0.2 + i * (mh + 0.012) + mh / 2
        objs.append(box("mod", (0.02, Wd - 0.03, mh), loc=(D / 2 + 0.005, 0, z), mat=fp, bevel=0.003))
        for y in (-Wd / 2 + 0.03, Wd / 2 - 0.03):
            objs.append(box("h", (0.03, 0.02, mh * 0.6), loc=(D / 2 + 0.03, y, z), mat=hdl, bevel=0.004))
        objs.append(cyl("led", 0.005, 0.003, loc=(D / 2 + 0.017, Wd * 0.25, z + mh * 0.25), rot=(0, math.pi / 2, 0), mat=led, verts=10))
    top = 0.2 + n * (mh + 0.012)
    objs.append(box("bms", (0.02, Wd - 0.03, 0.12), loc=(D / 2 + 0.005, 0, top + 0.08), mat=fp, bevel=0.003))
    disp = mat_basic("disp", (0.1, 0.4, 0.8), 0, 0.2, **{"Emission Color": (0.2, 0.55, 1.0, 1), "Emission Strength": 2.5})
    objs.append(box("screen", (0.004, 0.14, 0.06), loc=(D / 2 + 0.016, -Wd * 0.18, top + 0.08), mat=disp))
    objs.append(box("base", (D + 0.04, Wd + 0.08, 0.1), loc=(0, 0, 0.05), mat=mat_basic("base", (0.15, 0.15, 0.16), 0.6, 0.5)))
    objs.append(decal("label", lab, (0.2, 0.124), (D / 2 + 0.0165, Wd * 0.12, top + 0.08), (math.pi / 2, 0, math.pi / 2)))
    return objs


def build_home_ess(spec, rnd, lab):
    Wd, D, Hh = rnd.uniform(0.5, 0.62), rnd.uniform(0.16, 0.22), rnd.uniform(0.55, 0.85)
    body = mat_basic("home", rnd.choice([(0.92, 0.92, 0.9), (0.85, 0.86, 0.88), (0.15, 0.16, 0.17)]), 0.0, 0.3, **{"Coat Weight": 0.4})
    objs = [box("body", (D, Wd, Hh), loc=(0, 0, Hh / 2 + 0.04), mat=body, bevel=0.03, seg=6)]
    led = mat_basic("strip", (0.2, 0.6, 1.0), 0, 0.3, **{"Emission Color": (0.2, 0.6, 1.0, 1), "Emission Strength": 5.0})
    objs.append(box("strip", (0.003, 0.012, Hh * 0.5), loc=(D / 2 + 0.001, Wd * 0.3, Hh * 0.55), mat=led))
    objs.append(box("feet", (D * 0.8, Wd * 0.8, 0.04), loc=(0, 0, 0.02), mat=plastic((0.1, 0.1, 0.1))))
    objs.append(decal("label", lab, (0.16, 0.1), (D / 2 + 0.0015, -Wd * 0.12, Hh * 0.42), (math.pi / 2, 0, math.pi / 2)))
    return objs


def build_lmt(spec, rnd, lab, ebike):
    if ebike:
        L, Wd, Hh = rnd.uniform(0.34, 0.42), 0.085, 0.09
    else:
        L, Wd, Hh = rnd.uniform(0.32, 0.45), rnd.uniform(0.17, 0.24), rnd.uniform(0.15, 0.22)
    col = rnd.choice([(0.05, 0.05, 0.06), (0.2, 0.21, 0.23), (0.85, 0.86, 0.88), (0.1, 0.18, 0.3)])
    body = plastic(col, 0.4) if rnd.random() < 0.6 else alu(rnd, dark=True)
    objs = [box("body", (L, Wd, Hh), loc=(0, 0, Hh / 2), mat=body, bevel=min(Wd, Hh) * 0.35, seg=6)]
    acc = plastic(rnd.choice([(0.1, 0.7, 0.3), (0.95, 0.4, 0.05), (0.1, 0.5, 0.95), (0.85, 0.1, 0.15)]), 0.35)
    objs.append(box("accent", (L * 0.9, 0.004, Hh * 0.18), loc=(0, -Wd / 2 - 0.001, Hh * 0.62), mat=acc))
    if not ebike:
        hdl = plastic((0.05, 0.05, 0.05))
        objs.append(box("handle", (L * 0.4, 0.03, 0.03), loc=(0, 0, Hh + 0.045), mat=hdl, bevel=0.012))
        objs.append(box("hpost1", (0.025, 0.025, 0.045), loc=(-L * 0.18, 0, Hh + 0.02), mat=hdl))
        objs.append(box("hpost2", (0.025, 0.025, 0.045), loc=(L * 0.18, 0, Hh + 0.02), mat=hdl))
    objs.append(cyl("key", 0.009, 0.006, loc=(L * 0.38, -Wd / 2 - 0.002, Hh * 0.35), rot=(math.pi / 2, 0, 0), mat=mat_basic("key", (0.75, 0.75, 0.77), 1, 0.2), verts=16))
    objs.append(decal("label", lab, (0.09, 0.056), (-L * 0.15, -Wd / 2 - 0.0012, Hh * 0.35), (math.pi / 2, 0, 0)))
    return objs


def build_sli(spec, rnd, lab, lfp):
    L, Wd, Hh = rnd.uniform(0.24, 0.35), 0.175, rnd.uniform(0.175, 0.19)
    case = plastic((0.04, 0.04, 0.045) if not lfp else rnd.choice([(0.9, 0.9, 0.88), (0.1, 0.25, 0.5)]), 0.45)
    lid = plastic(rnd.choice([(0.45, 0.46, 0.48), (0.08, 0.08, 0.09), (0.1, 0.35, 0.7)]), 0.4)
    objs = [box("case", (L, Wd, Hh), loc=(0, 0, Hh / 2), mat=case, bevel=0.006), box("lid", (L + 0.004, Wd + 0.004, 0.022), loc=(0, 0, Hh + 0.005), mat=lid, bevel=0.005)]
    lead = mat_basic("lead", (0.55, 0.55, 0.56), 1, 0.45)
    for sx, cap in ((-1, (0.85, 0.1, 0.08)), (1, (0.05, 0.05, 0.05))):
        objs.append(cyl("post", 0.009, 0.02, loc=(sx * L * 0.38, -Wd * 0.3, Hh + 0.026), mat=lead, verts=20))
        objs.append(cyl("cap", 0.016, 0.006, loc=(sx * L * 0.38, -Wd * 0.3, Hh + 0.017), mat=plastic(cap), verts=24))
    objs.append(box("handle", (0.14, 0.012, 0.012), loc=(0, Wd * 0.2, Hh + 0.022), mat=plastic((0.08, 0.08, 0.08)), bevel=0.005))
    objs.append(decal("label", lab, (L * 0.8, L * 0.8 * 0.62), (0, -Wd / 2 - 0.0012, Hh * 0.47), (math.pi / 2, 0, 0)))
    return objs


def build_cylindrical(spec, rnd, lab):
    r, h = (0.0105, 0.07) if rnd.random() < 0.6 else (0.009, 0.065)
    nx, ny = rnd.randint(5, 9), rnd.randint(4, 7)
    wrap = plastic(rnd.choice([(0.08, 0.35, 0.8), (0.1, 0.55, 0.25), (0.8, 0.12, 0.1), (0.06, 0.06, 0.07), (0.55, 0.3, 0.75)]), 0.25)
    capm = mat_basic("cap", (0.78, 0.79, 0.8), 1, 0.2)
    objs = []
    for i in range(nx):
        for j in range(ny):
            x = (i - (nx - 1) / 2) * r * 2.08
            y = (j - (ny - 1) / 2) * r * 1.82 + (r * 1.04 if i % 2 else 0)
            objs.append(cyl("cell", r, h, loc=(x, y, h / 2 + 0.006), mat=wrap, verts=28))
            objs.append(cyl("top", r * 0.9, 0.0015, loc=(x, y, h + 0.0068), mat=capm, verts=24))
            objs.append(cyl("nub", r * 0.35, 0.0025, loc=(x, y, h + 0.008), mat=capm, verts=16))
    tray = plastic((0.08, 0.08, 0.09), 0.5)
    objs.append(box("tray", (nx * r * 2.2 + 0.02, ny * r * 1.9 + 0.03, 0.012), loc=(0, 0, 0.006), mat=tray, bevel=0.003))
    objs.append(decal("label", lab, (0.07, 0.044), (nx * r * 1.1 + 0.03, -ny * r * 0.7, 0.0003), (0, 0, math.radians(rnd.uniform(-12, 12)))))
    return objs


def build_portable(spec, rnd, lab):
    L, Wd, Hh = rnd.uniform(0.14, 0.2), rnd.uniform(0.07, 0.09), rnd.uniform(0.022, 0.03)
    col = rnd.choice([(0.05, 0.05, 0.06), (0.9, 0.9, 0.9), (0.2, 0.3, 0.5), (0.6, 0.62, 0.64), (0.75, 0.5, 0.4)])
    body = plastic(col, 0.35) if rnd.random() < 0.6 else alu(rnd, dark=col[0] < 0.3)
    objs = []
    n = rnd.randint(1, 3)
    for i in range(n):
        rot = math.radians(rnd.uniform(-25, 25))
        x = (i - (n - 1) / 2) * (Wd + 0.04)
        objs.append(box("body", (L, Wd, Hh), loc=(x, 0, Hh / 2 + i * 0.0), mat=body, bevel=Hh * 0.4, seg=6, rot=(0, 0, rot + math.pi / 2)))
        led = mat_basic("led", (0.2, 0.6, 1.0), 0, 0.3, **{"Emission Color": (0.2, 0.6, 1.0, 1), "Emission Strength": 4.0})
        for k in range(4):
            objs.append(cyl("led", 0.0015, 0.001, loc=(x + math.cos(rot + math.pi / 2) * (L * 0.3 - k * 0.006), math.sin(rot + math.pi / 2) * (L * 0.3 - k * 0.006), Hh + 0.0002), mat=led, verts=8))
    objs.append(decal("label", lab, (0.05, 0.031), (-0.0, 0, Hh + 0.0006), (0, 0, math.radians(90 + rnd.uniform(-20, 20)))))
    return objs


def build_forklift(spec, rnd, lab):
    L, Wd, Hh = rnd.uniform(0.8, 1.0), rnd.uniform(0.5, 0.65), rnd.uniform(0.6, 0.78)
    col = rnd.choice([(0.9, 0.62, 0.05), (0.08, 0.25, 0.55), (0.35, 0.37, 0.4), (0.1, 0.45, 0.25)])
    body = mat_noisy("paint", col, tuple(x * 0.85 for x in col), 0.1, 0.35, scale=20, rough2=0.5, bump=0.02)
    objs = [box("body", (L, Wd, Hh), loc=(0, 0, Hh / 2), mat=body, bevel=0.012)]
    eye = mat_basic("eye", (0.3, 0.3, 0.32), 1, 0.3)
    for x in (-L * 0.4, L * 0.4):
        for y in (-Wd * 0.4, Wd * 0.4):
            t = tube("eye", 0.03, 0.018, 0.012, loc=(x, y, Hh + 0.03), rot=(math.pi / 2, 0, 0), mats=[eye, eye, eye], verts=24)
            objs.append(t)
    objs.append(box("lid", (L * 0.92, Wd * 0.92, 0.02), loc=(0, 0, Hh + 0.01), mat=mat_basic("lid", (0.2, 0.2, 0.22), 0.8, 0.4), bevel=0.004))
    objs.append(box("plug", (0.1, 0.07, 0.06), loc=(L * 0.2, 0, Hh + 0.05), mat=plastic((0.85, 0.1, 0.08)), bevel=0.01))
    objs.append(decal("label", lab, (0.3, 0.186), (0, -Wd / 2 - 0.0012, Hh * 0.55), (math.pi / 2, 0, 0)))
    return objs


# ───────────────────────────── 섬유 ─────────────────────────────
def fabric_for(line, rnd, color):
    if line == "DENIM":
        return mat_fabric("denim", color, weave=260, twill=True, sheen=0.2, rough=0.9, color2=tuple(min(1, x * 1.5) for x in color))
    if line in ("SWEATER",):
        return mat_fabric("knit", color, weave=70, knit=True, sheen=0.7, rough=0.95, fuzzy=0.4)
    if line in ("TOWEL", "FLEECE"):
        return mat_noisy("pile", color, tuple(x * 0.8 for x in color), 0, 0.95, scale=180, bump=0.6, detail=4)
    if line == "JACKET":
        return mat_noisy("shell", color, tuple(x * 0.85 for x in color), 0.0, 0.35, scale=4, rough2=0.5, bump=0.25, **{})
    return mat_fabric("fab", color, weave=rnd.uniform(160, 240), sheen=rnd.uniform(0.3, 0.7))


GARMENT_COLORS = {
    "TSHIRT": [(0.9, 0.9, 0.88), (0.08, 0.08, 0.09), (0.55, 0.6, 0.68), (0.7, 0.62, 0.5), (0.3, 0.38, 0.28), (0.85, 0.72, 0.62), (0.15, 0.2, 0.35), (0.62, 0.18, 0.2)],
    "SWEATSHIRT": [(0.55, 0.55, 0.57), (0.12, 0.14, 0.22), (0.78, 0.7, 0.58), (0.35, 0.4, 0.3), (0.85, 0.85, 0.83)],
    "SWEATER": [(0.72, 0.63, 0.5), (0.3, 0.12, 0.12), (0.2, 0.25, 0.3), (0.88, 0.85, 0.78), (0.42, 0.45, 0.35), (0.6, 0.35, 0.2)],
    "DENIM": [(0.06, 0.1, 0.22), (0.12, 0.2, 0.38), (0.25, 0.35, 0.52), (0.08, 0.08, 0.1)],
    "JACKET": [(0.08, 0.2, 0.3), (0.15, 0.3, 0.2), (0.75, 0.3, 0.1), (0.1, 0.1, 0.12), (0.7, 0.68, 0.6), (0.6, 0.12, 0.1)],
    "FLEECE": [(0.85, 0.82, 0.75), (0.25, 0.3, 0.25), (0.55, 0.45, 0.35), (0.2, 0.22, 0.3)],
    "SHIRT": [(0.92, 0.92, 0.9), (0.62, 0.72, 0.85), (0.8, 0.75, 0.65), (0.45, 0.55, 0.45), (0.9, 0.85, 0.8)],
    "TOWEL": [(0.93, 0.93, 0.9), (0.75, 0.8, 0.85), (0.6, 0.55, 0.5), (0.35, 0.4, 0.45), (0.85, 0.78, 0.7)],
    "ROLL": [(0.85, 0.83, 0.78), (0.2, 0.25, 0.4), (0.55, 0.15, 0.15), (0.3, 0.4, 0.3), (0.7, 0.6, 0.45), (0.1, 0.1, 0.12),
             (0.6, 0.65, 0.7), (0.8, 0.55, 0.3), (0.4, 0.3, 0.5), (0.9, 0.9, 0.9)],
    "YARN": [(0.93, 0.92, 0.88), (0.1, 0.25, 0.55), (0.75, 0.2, 0.2), (0.2, 0.5, 0.35), (0.95, 0.75, 0.2), (0.4, 0.4, 0.42), (0.6, 0.35, 0.6)],
}


def build_garment_stack(spec, rnd, lab):
    line = spec["line"]
    base = {"TSHIRT": (0.3, 0.24, 0.018), "SWEATSHIRT": (0.34, 0.27, 0.035), "SWEATER": (0.33, 0.27, 0.04), "DENIM": (0.36, 0.26, 0.03),
            "JACKET": (0.38, 0.3, 0.06), "FLEECE": (0.36, 0.28, 0.05), "SHIRT": (0.3, 0.22, 0.02), "TOWEL": (0.32, 0.22, 0.04)}[line]
    Lx, Wy, t = base
    objs = []
    stacks = rnd.choice([1, 2, 2, 3])
    palette = GARMENT_COLORS[line][:]
    rnd.shuffle(palette)
    for s in range(stacks):
        n = rnd.randint(3, 6) if line not in ("JACKET",) else rnd.randint(2, 3)
        y0 = (s - (stacks - 1) / 2) * (Wy + 0.06)
        mono = rnd.random() < 0.5
        for i in range(n):
            col = palette[(s if mono else s + i) % len(palette)]
            m = fabric_for(line, rnd, col)
            z = t / 2 + i * t * 0.96
            ob = box("fold", (Lx * rnd.uniform(0.97, 1.03), Wy * rnd.uniform(0.97, 1.03), t), loc=(rnd.uniform(-0.01, 0.01), y0 + rnd.uniform(-0.01, 0.01), z),
                     mat=m, bevel=t * 0.48, seg=5, rot=(0, 0, math.radians(rnd.uniform(-3, 3))))
            sd = ob.modifiers.new("sd", "SUBSURF")
            sd.levels = 1
            sd.render_levels = 2
            objs.append(ob)
            # 칼라/허리선 흉내 - 위쪽 가장자리의 얇은 띠
            if line in ("TSHIRT", "SWEATSHIRT", "SWEATER", "SHIRT", "FLEECE", "JACKET") and i == n - 1:
                objs.append(box("collar", (Lx * 0.25, 0.04, t * 0.35), loc=(-Lx * 0.36, y0, z + t * 0.5), mat=m, bevel=0.01, seg=3))
            if line == "DENIM" and i == n - 1:
                objs.append(box("waist", (0.05, Wy * 0.98, t * 0.3), loc=(-Lx * 0.45, y0, z + t * 0.5), mat=m, bevel=0.006))
                objs.append(cyl("button", 0.007, 0.004, loc=(-Lx * 0.45, y0 - Wy * 0.3, z + t * 0.7), mat=mat_basic("btn", (0.6, 0.45, 0.2), 1, 0.3), verts=16))
        if s == 0:
            top = n * t * 0.96
            tag = decal("tag", lab, (0.09, 0.056), (Lx * 0.1, y0, top + 0.002), (0, 0, math.radians(rnd.uniform(-20, 20))))
            objs.append(tag)
    return objs


def build_rolls(spec, rnd, lab):
    line = spec["line"]
    n = rnd.choice([1, 2, 3, 3, 4, 5])
    r = rnd.uniform(0.12, 0.2)
    L = rnd.uniform(1.4, 1.6)
    core = mat_noisy("core", (0.55, 0.42, 0.28), (0.66, 0.52, 0.35), 0, 0.8, scale=20, bump=0.1)
    palette = GARMENT_COLORS["ROLL"][:]
    rnd.shuffle(palette)
    objs = []
    stand = rnd.random() < 0.3
    for i in range(n):
        col = palette[i % len(palette)]
        if line == "FABRIC_ROLL_LINEN":
            col = rnd.choice([(0.78, 0.72, 0.6), (0.85, 0.82, 0.75), (0.5, 0.55, 0.45), (0.65, 0.5, 0.4), (0.35, 0.4, 0.5)])
        knit = line == "FABRIC_ROLL_KNIT"
        m = mat_fabric("roll", col, weave=rnd.uniform(200, 320), knit=knit, sheen=0.4 if line != "FABRIC_ROLL_POLY" else 0.8,
                       rough=0.85 if line != "FABRIC_ROLL_POLY" else 0.5)
        side = mat_noisy("rollside", tuple(x * 0.8 for x in col), col, 0, 0.8, bump=0.4, wave={"rings": True, "dir": "Z", "scale": 90, "distortion": 1.2})
        if stand:
            loc = ((i % 3 - 1) * (r * 2.3), (i // 3) * r * 2.3, L / 2)
            rot = (0, 0, 0)
        else:
            row = 0 if i < 3 else 1
            k = i if i < 3 else i - 3
            loc = (0, (k - (min(n, 3) - 1) / 2) * r * 2.02 + (r if row else 0), r + row * r * 1.72)
            rot = (0, math.pi / 2, 0)
        ob = tube("roll", r, 0.04, L, loc=loc, rot=rot, mats=[m, side, core])
        objs.append(ob)
        objs.append(tube("core", 0.045, 0.036, L + 0.04, loc=loc, rot=rot, mats=[core, core, core], verts=32))
        if i == 0:
            if stand:
                objs.append(decal("tag", lab, (0.12, 0.075), (loc[0], loc[1] - r - 0.001, L * 0.7), (math.pi / 2, 0, 0)))
            else:
                objs.append(decal("tag", lab, (0.12, 0.075), (L / 2 + 0.021, loc[1], loc[2] + r * 0.45), (math.pi / 2, 0, math.pi / 2)))
    return objs


def build_yarn(spec, rnd, lab):
    nx, ny = rnd.randint(3, 5), rnd.randint(2, 4)
    palette = GARMENT_COLORS["YARN"][:]
    rnd.shuffle(palette)
    mono = rnd.random() < 0.55
    objs = []
    tubem = mat_noisy("ctube", (0.55, 0.4, 0.25), (0.7, 0.55, 0.35), 0, 0.7, scale=25, bump=0.05)
    for i in range(nx):
        for j in range(ny):
            col = palette[0 if mono else (i + j) % len(palette)]
            m = mat_noisy("yarn", tuple(x * 0.82 for x in col), col, 0, 0.85, bump=0.5,
                          wave={"type": "BANDS", "dir": "Z", "scale": 160, "distortion": 0.6}, stretch=(1, 1, 1))
            x, y = (i - (nx - 1) / 2) * 0.2, (j - (ny - 1) / 2) * 0.2
            bpy.ops.mesh.primitive_cone_add(radius1=0.085, radius2=0.055, depth=0.16, location=(x, y, 0.08 + 0.01), vertices=48)
            c = bpy.context.object
            c.data.materials.append(m)
            bpy.ops.object.shade_smooth()
            objs.append(c)
            objs.append(cyl("tube", 0.03, 0.2, loc=(x, y, 0.1), mat=tubem, verts=24))
    objs.append(box("tray", (nx * 0.2 + 0.04, ny * 0.2 + 0.04, 0.01), loc=(0, 0, 0.005), mat=wood_mat()))
    objs.append(decal("tag", lab, (0.12, 0.075), (0, -(ny) * 0.1 - 0.021, 0.006), (math.radians(0), 0, 0)))
    objs[-1].location.z = 0.0105
    return objs


BUILDERS = {
    "SECTION": build_section, "PLATE": build_plate,
    "HR_COIL": lambda s, r, l: build_coil(s, r, l, "coil"), "CR_COIL": lambda s, r, l: build_coil(s, r, l, "coil"),
    "HDG_COIL": lambda s, r, l: build_coil(s, r, l, "coil"), "WIRE_ROD": build_wire,
    "REBAR": lambda s, r, l: build_bars(s, r, l, True), "BAR": lambda s, r, l: build_bars(s, r, l, False),
    "EV_PACK": build_ev_pack, "EV_MODULE": build_module, "PRISMATIC": build_prismatic_cells, "POUCH": build_pouch,
    "ESS_RACK": build_ess_rack, "ESS_MODULE": lambda s, r, l: build_module(s, r, l, ess=True), "ESS_HOME": build_home_ess,
    "LMT_EBIKE": lambda s, r, l: build_lmt(s, r, l, True), "LMT_SCOOTER": lambda s, r, l: build_lmt(s, r, l, False),
    "SLI_AGM": lambda s, r, l: build_sli(s, r, l, False), "SLI_LFP": lambda s, r, l: build_sli(s, r, l, True),
    "CYLINDRICAL": build_cylindrical, "PORTABLE": build_portable, "INDUSTRIAL_FORKLIFT": build_forklift,
    "TSHIRT": build_garment_stack, "SWEATSHIRT": build_garment_stack, "SWEATER": build_garment_stack, "DENIM": build_garment_stack,
    "JACKET": build_garment_stack, "FLEECE": build_garment_stack, "SHIRT": build_garment_stack, "TOWEL": build_garment_stack,
    "FABRIC_ROLL_WOVEN": build_rolls, "FABRIC_ROLL_KNIT": build_rolls, "FABRIC_ROLL_LINEN": build_rolls, "FABRIC_ROLL_POLY": build_rolls,
    "YARN": build_yarn,
}
STEEL_LINES = {"SECTION", "PLATE", "HR_COIL", "CR_COIL", "HDG_COIL", "WIRE_ROD", "REBAR", "BAR"}
SMALL = {"PRISMATIC", "POUCH", "CYLINDRICAL", "PORTABLE"}
TEXT = {"TSHIRT", "SWEATSHIRT", "SWEATER", "DENIM", "JACKET", "FLEECE", "SHIRT", "TOWEL", "YARN"}


def render_one(spec, out):
    rnd = random.Random(spec["seed"])
    reset()
    line = spec["line"]
    lb = spec["label"]
    style = "white"
    if line in STEEL_LINES:
        style = rnd.choice(["white", "yellow", "white"])
    elif line in TEXT or line.startswith("FABRIC"):
        style = rnd.choice(["white", "kraft"])
    lab_path = os.path.join(TMP, f"lab_{os.getpid()}.png")
    labelmod.make_label(lab_path, lb["company"], lb["product"], lb["serial"], lb["url"], style=style,
                        accent=tuple(lb.get("accent", (0, 69, 169))), lines=lb.get("lines"))
    objs = BUILDERS[line](spec, rnd, lab_path)
    drop_to_floor(objs)
    if line in STEEL_LINES or line in ("INDUSTRIAL_FORKLIFT", "ESS_RACK", "EV_PACK"):
        bd = rnd.choice(["concrete", "concrete", "studio_light", "studio_cool", "studio_dark"])
    elif line in SMALL:
        bd = rnd.choice(["studio_light", "studio_warm", "studio_cool", "studio_dark"])
    else:
        bd = rnd.choice(["studio_light", "studio_warm", "studio_cool", "studio_light"])
    # 배경 크기는 제품 크기에 맞춘다
    bpy.context.view_layer.update()
    span = max(max(ob.dimensions) for ob in objs)
    big = max(span * 6, 3)
    backdrop(bd, rnd, extent=big)
    center, radius = camera(rnd, objs, elev=(12, 34) if line not in SMALL else (25, 50))
    lights(rnd, center, radius, dark=bd == "studio_dark")
    sc = bpy.context.scene
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)


def main():
    specs = json.load(open(sys.argv[1]))
    out_dir = sys.argv[2]
    start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    step = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    threads = int(os.environ.get("RTHREADS", "0"))
    os.makedirs(out_dir, exist_ok=True)
    done = 0
    t0 = time.time()
    for i in range(start, len(specs), step):
        s = specs[i]
        out = os.path.join(out_dir, s["uuid"] + ".jpg")
        if os.path.exists(out) and os.path.getsize(out) > 5000:
            continue
        try:
            if threads:
                bpy.context.scene.render.threads_mode = "FIXED"
            render_one(s, out)
            if threads:
                pass
        except Exception as e:
            print("FAIL", s["uuid"], s["line"], repr(e), flush=True)
            import traceback
            traceback.print_exc()
            continue
        done += 1
        print(f"OK {i} {s['line']} {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
