p = "src/app/api/v1/endpoints/admin.py"
s = open(p, encoding="utf-8").read()
old = 'select(Series).where(Series.id == UUID(series_id)).options(selectinload(Series.episodes))'
new = 'select(Series).where(Series.id == series_id).options(selectinload(Series.episodes))'
assert old in s
s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
print("ok")
