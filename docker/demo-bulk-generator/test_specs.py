import json, sys
sys.path.insert(0,'.')
from render_photo import BUILDERS
specs=[]
for i,l in enumerate(BUILDERS):
    specs.append(dict(uuid=f"test-{i:02d}-{l}", line=l, seed=1000+i, size="H400×200×8×13",
        label=dict(company="한결제강", product="S355JR H형강 400×200", serial="HGS-2608-4121A", url="http://localhost/p/6f1c2d3e-9a8b-4c7d-8e6f-5a4b3c2d1e0f", lines=["Heat H2608412 · 12.0 m","EN 10025-2:2019"])))
json.dump(specs,open('/home/claude/render/test_specs.json','w'),ensure_ascii=False)
print(len(specs))
