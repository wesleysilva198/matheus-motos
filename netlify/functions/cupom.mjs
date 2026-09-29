import { getStore } from "@netlify/blobs";

const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return j({ ok: false, msg: "Método inválido" }, 405);
  const { code, pin, acao } = await req.json().catch(() => ({}));
  if (!process.env.PIN_ATENDENTE || pin !== process.env.PIN_ATENDENTE) return j({ ok: false, msg: "PIN incorreto" }, 401);

  const store = getStore("matheus-motos");
  const key = "cupom/" + String(code || "").toUpperCase().trim();
  const c = await store.get(key, { type: "json" });
  if (!c) return j({ ok: false, msg: "Cupom não encontrado" });

  const vencido = new Date(c.exp) < new Date();
  if (acao === "usar") {
    if (c.usado) return j({ ok: false, msg: "Cupom já foi usado em " + new Date(c.usado).toLocaleString("pt-BR", { timeZone: "America/Bahia" }) });
    if (vencido) return j({ ok: false, msg: "Cupom vencido em " + c.expTxt });
    c.usado = new Date().toISOString();
    await store.setJSON(key, c);
    return j({ ok: true, msg: "✅ Desconto de " + c.pct + "% aplicado. Cupom baixado." + (c.verificado === false ? " (Cupom sem verificação automática, você conferiu o print?)" : ""), pct: c.pct });
  }
  return j({
    ok: true, pct: c.pct,
    msg: (c.usado ? "⚠️ JÁ USADO" : vencido ? "⚠️ VENCIDO em " + c.expTxt : "✅ Válido: " + c.pct + "% de desconto (até " + c.expTxt + ")") + (c.verificado === false ? " — ⚠️ NÃO VERIFICADO pelo sistema: confira o print da avaliação antes de dar o desconto" : ""),
  });
};

export const config = { path: "/api/cupom" };
