import json, sys
sys.path.insert(0, '.')
from orgs import build_orgs
from models import build_models, SHORT
from dpps import build_dpps
orgs = build_orgs(); models = build_models(orgs); dpps = build_dpps(orgs, models)
ob = {o['key']: o for o in orgs}
ACC = {'STEEL': [(0,69,169),(30,40,60),(160,30,30),(0,110,90)], 'BATTERY': [(18,161,80),(0,90,170),(230,90,0),(60,60,70)], 'TEXTILE': [(120,60,40),(40,40,40),(160,120,60),(0,69,169)]}
specs = []
for i, d in enumerate(dpps):
    m = d['model']; o = ob[d['org']]
    short = o['name'].replace(' 주식회사', '')
    if d['domain'] == 'STEEL':
        prod = f"{m['grade']} {m['kind']} {m['size']}"; lines = [f"Heat {d['heat']}", m['std']]
    elif d['domain'] == 'BATTERY':
        prod = f"{m['sfx']} {m['kind']}"; lines = [f"{m['chem']} · {m['kwh']} kWh · {m['v']} V", m['cat']]
    else:
        prod = m['name'].split(' ', 1)[1]; lines = [" / ".join(f"{c} {p}%" for c, p in m['comp'])[:30], m['kind']]
    acc = ACC[d['domain']][hash(o['key']) % 4]
    specs.append(dict(uuid=d['uuid'], line=m['line'], seed=10000 + i, size=m.get('size', ''),
                      label=dict(company=short, product=prod, serial=d['serial'], url='http://localhost/p/' + d['uuid'], lines=lines, accent=acc)))
json.dump(specs, open('/home/claude/render/specs.json', 'w'), ensure_ascii=False)
from collections import Counter
print(len(orgs), len(models), len(dpps), Counter(d['status'] for d in dpps))
print(Counter(s['line'] for s in specs).most_common(8))
