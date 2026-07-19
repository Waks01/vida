p = "C:/Users/kenik/OneDrive/Desktop/Vida/docs/architecture/api.md"
s = open(p, encoding="utf-8").read()
s = s.replace(
    "| content | POST | `/episodes/{id}/unlock` | JWT | `{method: coins|subscription|ad}` |",
    "| content | POST | `/episodes/{id}/unlock` | JWT | `{method: coins|subscription|ad}` (coin_cost default 30) |",
)
s = s.replace(
    "| payments | POST | `/subscription/cancel` | JWT + PIN | cancel VIP |",
    "| payments | POST | `/subscription/cancel` | JWT + PIN | cancel VIP (PIN-verified) |",
)
s = s.replace(
    "  subscription create/status endpoints are NOT part of Phase 1 (only cancel);\n"
    "  watch heartbeat persists no-op in Phase 1.",
    "  subscription create/status endpoints are NOT part of Phase 1 (only cancel, which is\n"
    "  PIN-verified per design §7); watch heartbeat persists no-op in Phase 1.\n"
    "  `episodes.coin_cost` default is 30 (matches design §8).",
)
open(p, "w", encoding="utf-8").write(s)
print("api.md patched")
