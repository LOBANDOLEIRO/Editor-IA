"""Análise da CEAPS (cota parlamentar do Senado) — Flávio Bolsonaro x demais senadores.

Fonte: https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}
Uso: python3 -I dados/scripts/ceaps_analise.py
"""
import json
import re
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "raw" / "ceaps"
OUT = BASE / "out"
OUT.mkdir(exist_ok=True)
FLAVIO = 5894

CAT_CURTA = {
    "Aluguel de imóveis": "Aluguel de escritório",
    "Aquisição de material": "Material de consumo",
    "Contratação de consultorias": "Consultorias e assessorias",
    "Divulgação da atividade": "Divulgação da atividade",
    "Locomoção, hospedagem": "Locomoção, hospedagem e combustível",
    "Passagens aéreas": "Passagens",
    "Serviços de Segurança": "Segurança privada",
}


def curta(cat):
    if not isinstance(cat, str):
        return "Não informado"
    for k, v in CAT_CURTA.items():
        if cat.startswith(k):
            return v
    return cat[:40]


def load():
    frames = []
    for f in sorted(RAW.glob("ceaps_*.json")):
        frames.append(pd.DataFrame(json.loads(f.read_text())))
    df = pd.concat(frames, ignore_index=True)
    df["categoria"] = df["tipoDespesa"].map(curta)
    df["data"] = pd.to_datetime(df["data"], errors="coerce")
    return df


def cnpj_valido(s):
    d = re.sub(r"\D", "", s or "")
    if len(d) == 14:
        if d == d[0] * 14:
            return False
        def dv(base, pesos):
            r = sum(int(a) * b for a, b in zip(base, pesos)) % 11
            return "0" if r < 2 else str(11 - r)
        p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        p2 = [6] + p1
        return d[12] == dv(d[:12], p1) and d[13] == dv(d[:13], p2)
    if len(d) == 11:
        if d == d[0] * 11:
            return False
        for i in (9, 10):
            s_ = sum(int(d[j]) * (i + 1 - j) for j in range(i))
            if str((s_ * 10) % 11 % 10) != d[i]:
                return False
        return True
    return False


def main():
    df = load()
    res = {}

    # --- Totais por senador e ano
    tot = df.groupby(["ano", "codSenador", "nomeSenador"]).agg(
        total=("valorReembolsado", "sum"),
        meses=("mes", "nunique"),
        notas=("id", "count"),
    ).reset_index()
    linhas = []
    for ano, g in tot.groupby("ano"):
        cheios = g[g.meses >= 9]  # senadores com ao menos 9 meses de gasto no ano
        f = g[g.codSenador == FLAVIO].iloc[0]
        rank = int((g.total > f.total).sum()) + 1
        linhas.append({
            "ano": int(ano),
            "flavio": round(float(f.total), 2),
            "flavio_meses": int(f.meses),
            "flavio_notas": int(f.notas),
            "mediana_senado": round(float(cheios.total.median()), 2),
            "p75_senado": round(float(cheios.total.quantile(0.75)), 2),
            "max_senado": round(float(g.total.max()), 2),
            "rank": rank,
            "n_senadores": int(len(g)),
            "total_senado": round(float(g.total.sum()), 2),
        })
    res["por_ano"] = linhas

    # Ranking acumulado 2019-2026 (só quem esteve no Senado nos 8 anos)
    acc = df.groupby(["codSenador", "nomeSenador"]).agg(
        total=("valorReembolsado", "sum"), anos=("ano", "nunique")).reset_index()
    acc8 = acc[acc.anos == acc.anos.max()].sort_values("total", ascending=False).reset_index(drop=True)
    pos = acc8.index[acc8.codSenador == FLAVIO][0] + 1
    res["acumulado"] = {
        "flavio": round(float(acc8.loc[pos - 1, "total"]), 2),
        "posicao": int(pos),
        "n": int(len(acc8)),
        "mediana": round(float(acc8.total.median()), 2),
        "top5": acc8.head(5)[["nomeSenador", "total"]].round(2).values.tolist(),
    }

    fl = df[df.codSenador == FLAVIO].copy()
    fl.to_csv(OUT / "flavio_ceaps_2019_2026.csv", index=False)

    # --- Categorias: Flávio x mediana de participação dos senadores
    cat_f = fl.groupby("categoria").valorReembolsado.sum().sort_values(ascending=False)
    share_sen = (df.groupby(["codSenador", "categoria"]).valorReembolsado.sum()
                 / df.groupby("codSenador").valorReembolsado.sum()).unstack(fill_value=0)
    res["categorias"] = [{
        "categoria": c,
        "valor": round(float(v), 2),
        "pct_flavio": round(float(v / cat_f.sum() * 100), 1),
        "pct_mediana_senado": round(float(share_sen[c].median() * 100), 1) if c in share_sen else None,
    } for c, v in cat_f.items()]
    res["cat_ano"] = fl.pivot_table(index="ano", columns="categoria", values="valorReembolsado",
                                    aggfunc="sum", fill_value=0).round(2).reset_index().to_dict("records")

    # --- Fornecedores
    forn = fl.groupby(["cpfCnpj", "fornecedor"]).agg(
        total=("valorReembolsado", "sum"), notas=("id", "count"),
        anos=("ano", lambda s: f"{s.min()}–{s.max()}"),
        categoria=("categoria", lambda s: s.mode().iat[0])).reset_index()
    # nome mais frequente por CNPJ
    forn = forn.groupby("cpfCnpj").agg(fornecedor=("fornecedor", "first"), total=("total", "sum"),
                                       notas=("notas", "sum"), anos=("anos", "first"),
                                       categoria=("categoria", "first")).reset_index()
    forn = forn.sort_values("total", ascending=False)
    forn["pct"] = (forn.total / fl.valorReembolsado.sum() * 100).round(1)
    res["fornecedores_top"] = forn.head(20).round(2).to_dict("records")
    # quantos outros senadores usam o mesmo fornecedor
    usuarios = df.groupby("cpfCnpj").codSenador.nunique()
    for r in res["fornecedores_top"]:
        r["outros_senadores"] = int(usuarios.get(r["cpfCnpj"], 1) - 1)

    # --- Maiores notas individuais + z-score dentro da categoria (senado inteiro)
    stats = df.groupby("categoria").valorReembolsado.describe(percentiles=[.5, .95, .99])
    fl["p99_cat"] = fl.categoria.map(stats["99%"])
    fl["mediana_cat"] = fl.categoria.map(stats["50%"])
    top = fl.sort_values("valorReembolsado", ascending=False).head(25)
    res["maiores_notas"] = top[["data", "ano", "mes", "categoria", "fornecedor", "cpfCnpj", "documento",
                                "valorReembolsado", "mediana_cat", "p99_cat", "detalhamento", "tipoDocumento"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).round(2).to_dict("records")
    res["acima_p99"] = {
        "n": int((fl.valorReembolsado > fl.p99_cat).sum()),
        "valor": round(float(fl.loc[fl.valorReembolsado > fl.p99_cat, "valorReembolsado"].sum()), 2),
    }
    # mesma métrica para todo senador, para saber se é muito ou pouco
    df["p99_cat"] = df.categoria.map(stats["99%"])
    acima = df[df.valorReembolsado > df.p99_cat].groupby("codSenador").valorReembolsado.sum()
    tot_sen = df.groupby("codSenador").valorReembolsado.sum()
    pct_acima = (acima / tot_sen).fillna(0).sort_values(ascending=False)
    res["acima_p99"]["pct_do_total_flavio"] = round(float(pct_acima.get(FLAVIO, 0) * 100), 1)
    res["acima_p99"]["pct_mediana_senado"] = round(float(pct_acima.median() * 100), 1)
    res["acima_p99"]["rank"] = int(list(pct_acima.index).index(FLAVIO) + 1) if FLAVIO in pct_acima.index else None
    res["acima_p99"]["n_senadores"] = int(len(pct_acima))

    # --- Checagens de inconsistência
    chk = {}
    dup = fl[fl.duplicated(["cpfCnpj", "documento", "valorReembolsado"], keep=False)]
    chk["duplicadas_mesmo_doc_valor"] = dup.sort_values(["cpfCnpj", "documento"])[
        ["data", "fornecedor", "cpfCnpj", "documento", "valorReembolsado", "categoria", "id"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).to_dict("records")
    mesmo_doc = fl[fl.duplicated(["cpfCnpj", "documento"], keep=False) & ~fl.index.isin(dup.index)]
    chk["mesmo_doc_valores_diferentes"] = mesmo_doc.sort_values(["cpfCnpj", "documento"])[
        ["data", "fornecedor", "cpfCnpj", "documento", "valorReembolsado", "categoria"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).to_dict("records")
    ref = pd.to_datetime(dict(year=fl.ano, month=fl.mes, day=1))
    gap = (ref - fl.data.dt.to_period("M").dt.to_timestamp()).dt.days / 30.4
    fora = fl[(gap.abs() > 3) | fl.data.isna()]
    chk["data_distante_do_mes_ref"] = fora[["data", "ano", "mes", "fornecedor", "valorReembolsado", "categoria"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).to_dict("records")
    chk["antes_da_posse"] = fl[fl.data < "2019-02-01"][["data", "fornecedor", "valorReembolsado", "categoria"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).to_dict("records")
    fl["doc_ok"] = fl.cpfCnpj.map(cnpj_valido)
    chk["cpf_cnpj_invalido"] = fl[~fl.doc_ok][["data", "fornecedor", "cpfCnpj", "valorReembolsado"]] \
        .assign(data=lambda x: x.data.dt.strftime("%Y-%m-%d")).to_dict("records")
    pf = fl[fl.cpfCnpj.str.replace(r"\D", "", regex=True).str.len() == 11]
    chk["pessoa_fisica"] = pf.groupby(["fornecedor", "categoria"]).valorReembolsado.agg(["sum", "count"]) \
        .reset_index().round(2).to_dict("records")
    redondo = fl[(fl.valorReembolsado >= 1000) & (fl.valorReembolsado % 100 == 0)]
    chk["valores_redondos_>=1000"] = {"n": int(len(redondo)), "valor": round(float(redondo.valorReembolsado.sum()), 2),
                                       "pct_notas": round(len(redondo) / len(fl) * 100, 1)}
    df["redondo"] = (df.valorReembolsado >= 1000) & (df.valorReembolsado % 100 == 0)
    chk["valores_redondos_mediana_senado_pct"] = round(float(df.groupby("codSenador").redondo.mean().median() * 100), 1)
    fds = fl[fl.data.dt.dayofweek >= 5]
    chk["fim_de_semana"] = {"n": int(len(fds)), "valor": round(float(fds.valorReembolsado.sum()), 2),
                            "por_categoria": fds.groupby("categoria").valorReembolsado.sum().round(2).to_dict()}
    sem_doc = fl[fl.documento.isna() | fl.documento.astype(str).str.strip().str.upper().isin(["", "S/N", "SN", "0"])]
    chk["sem_numero_documento"] = {"n": int(len(sem_doc)), "valor": round(float(sem_doc.valorReembolsado.sum()), 2)}
    chk["tipos_documento"] = fl.groupby("tipoDocumento").valorReembolsado.agg(["sum", "count"]).round(2) \
        .reset_index().to_dict("records")
    res["checagens"] = chk

    # --- Pares do RJ (o teto da cota é por UF)
    res["n_notas_flavio"] = int(len(fl))
    res["total_flavio"] = round(float(fl.valorReembolsado.sum()), 2)
    (OUT / "ceaps_resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=str))
    forn.to_csv(OUT / "flavio_fornecedores.csv", index=False)
    print(json.dumps({k: res[k] for k in ("por_ano", "acumulado", "categorias", "acima_p99")},
                     ensure_ascii=False, indent=1, default=str))


if __name__ == "__main__":
    main()
