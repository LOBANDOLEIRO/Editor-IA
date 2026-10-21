"""Cartão de pagamento (CPGF) da Presidência — Lula x outros presidentes.

Fontes:
- 2003–2022: planilha Suprim divulgada pela SG/Casa Civil em jan/2023
  (cartao2003-202208032023.csv)
- 2019–2026: extratos mensais do Portal da Transparência
  (https://portaldatransparencia.gov.br/download-de-dados/cpgf/AAAAMM)
- IPCA: BCB SGS série 433
Uso: python3 -I dados/scripts/cartao_presidencia.py
"""
import csv
import io
import json
import re
import unicodedata
import zipfile
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "raw"
OUT = BASE / "out"
UG_PRESIDENTE = {"110001", "110809"}  # Secretaria de Administração/PR (inclui "Peculiaridades")


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9 ,./-]", "", s.upper()).strip()


def mandato(d):
    if d < pd.Timestamp("2011-01-01"):
        return "Lula 1-2 (2003-2010)"
    if d < pd.Timestamp("2016-05-12"):
        return "Dilma (2011-mai/2016)"
    if d < pd.Timestamp("2019-01-01"):
        return "Temer (mai/2016-2018)"
    if d < pd.Timestamp("2023-01-01"):
        return "Bolsonaro (2019-2022)"
    return "Lula 3 (2023-)"


def ipca_fator():
    s = pd.DataFrame(json.loads((RAW / "ipca" / "ipca_433.json").read_text()))
    s["data"] = pd.to_datetime(s.data, dayfirst=True)
    s["v"] = s.valor.astype(float) / 100 + 1
    s["idx"] = s.v.cumprod()
    ref = s.idx.iloc[-1]
    return dict(zip(s.data.dt.to_period("M"), ref / s.idx)), str(s.data.iloc[-1].date())


def load_hist():
    raw = (RAW / "cartao_hist" / "cartao2003-2022.csv").read_bytes().decode("cp850")
    lines = raw.splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith("DATA PGTO"))
    end = next(i for i, l in enumerate(lines) if i > start and l.startswith("DATA PGTO"))
    rows = list(csv.reader(lines[start + 1:end], delimiter=";"))
    df = pd.DataFrame([r[:8] for r in rows if len(r) >= 8 and r[0].strip()],
                      columns=["data", "cpf_servidor", "doc_fornecedor", "fornecedor", "valor", "tipo",
                               "subelemento", "cdic"])
    df["data"] = pd.to_datetime(df.data, dayfirst=True, errors="coerce")
    df["valor"] = (df.valor.str.replace("R$", "", regex=False).str.replace(".", "", regex=False)
                   .str.replace(",", ".", regex=False).str.replace(r"[^\d.\-]", "", regex=True))
    df["valor"] = pd.to_numeric(df.valor, errors="coerce")
    df["subelemento"] = df.subelemento.map(norm)
    # parte das linhas veio com acentuação corrompida (ex.: "ALIMENTAAO"); unifica pela grafia mais comum
    chave = df.subelemento.str.replace(r"[^A-Z]", "", regex=True).str.replace("C", "", regex=False)
    canon = df.groupby(chave).subelemento.agg(lambda s: s.value_counts().index[0])
    df["subelemento"] = chave.map(canon)
    df["fornecedor"] = df.fornecedor.map(norm)
    df["doc_cientifico"] = df.doc_fornecedor.str.contains("E+", regex=False)
    return df


def load_portal():
    out = []
    for f in sorted((RAW / "cpgf").glob("*.zip")):
        z = zipfile.ZipFile(f)
        for n in z.namelist():
            for r in csv.DictReader(io.TextIOWrapper(z.open(n), encoding="latin1"), delimiter=";"):
                if r["CÓDIGO UNIDADE GESTORA"] in UG_PRESIDENTE or r["NOME ÓRGÃO SUPERIOR"] == "Presidência da República":
                    out.append(r)
    df = pd.DataFrame(out)
    df["valor"] = pd.to_numeric(df["VALOR TRANSAÇÃO"].str.replace(".", "", regex=False).str.replace(",", "."))
    df["ano"] = df["ANO EXTRATO"].astype(int)
    df["mes"] = df["MÊS EXTRATO"].astype(int)
    df["data"] = pd.to_datetime(df["DATA TRANSAÇÃO"], dayfirst=True, errors="coerce")
    df["ug"] = df["CÓDIGO UNIDADE GESTORA"]
    df["ug_nome"] = df["NOME UNIDADE GESTORA"]
    df["favorecido"] = df["NOME FAVORECIDO"].map(norm)
    df["transacao"] = df["TRANSAÇÃO"]
    return df


def main():
    fator, ipca_ate = ipca_fator()
    res = {"ipca_ate": ipca_ate}

    # ---------- Série histórica 2003–2022 (Suprim)
    h = load_hist()
    h = h.dropna(subset=["data", "valor"])
    h["ano"] = h.data.dt.year
    h["mandato"] = h.data.map(mandato)
    h["valor_real"] = h.valor * h.data.dt.to_period("M").map(fator)
    res["hist_linhas"] = int(len(h))
    res["hist_cnpj_corrompido_pct"] = round(float(h.doc_cientifico.mean() * 100), 1)
    por_ano = h.groupby("ano").agg(nominal=("valor", "sum"), real=("valor_real", "sum"),
                                  saques=("valor", lambda s: s[h.loc[s.index, "tipo"] == "D"].sum()))
    res["hist_por_ano"] = por_ano.round(2).reset_index().to_dict("records")
    meses = h.groupby("mandato").data.agg(lambda s: (s.max().to_period("M") - s.min().to_period("M")).n + 1)
    por_m = h.groupby("mandato").agg(nominal=("valor", "sum"), real=("valor_real", "sum"))
    por_m["saque_pct"] = h[h.tipo == "D"].groupby("mandato").valor.sum() / por_m.nominal * 100
    por_m["meses"] = meses
    por_m["real_por_mes"] = por_m.real / por_m.meses
    res["hist_por_mandato"] = por_m.round(2).reset_index().to_dict("records")

    lula = h[h.mandato.str.startswith("Lula")]
    cat = lula.groupby("subelemento").agg(nominal=("valor", "sum"), real=("valor_real", "sum"),
                                         n=("valor", "count")).sort_values("real", ascending=False)
    cat["pct"] = cat.real / cat.real.sum() * 100
    res["lula12_categorias"] = cat.head(12).round(2).reset_index().to_dict("records")
    forn = lula.groupby("fornecedor").agg(nominal=("valor", "sum"), real=("valor_real", "sum"),
                                         n=("valor", "count"),
                                         cat=("subelemento", lambda s: s.mode().iat[0])) \
        .sort_values("real", ascending=False)
    res["lula12_fornecedores"] = forn.head(20).round(2).reset_index().to_dict("records")
    big = lula.sort_values("valor_real", ascending=False).head(20)
    res["lula12_maiores"] = big.assign(data=big.data.dt.strftime("%Y-%m-%d"))[
        ["data", "fornecedor", "subelemento", "tipo", "valor", "valor_real"]].round(2).to_dict("records")
    saq = lula[lula.tipo == "D"]
    res["lula12_saques"] = {"n": int(len(saq)), "nominal": round(float(saq.valor.sum()), 2),
                            "real": round(float(saq.valor_real.sum()), 2),
                            "por_ano": saq.groupby("ano").valor.sum().round(2).to_dict(),
                            "top_cat": saq.groupby("subelemento").valor_real.sum().sort_values(ascending=False)
                            .head(8).round(2).to_dict()}
    # categorias por mandato (participação), para comparar padrão
    share = (h.groupby(["mandato", "subelemento"]).valor_real.sum()
             / h.groupby("mandato").valor_real.sum() * 100).unstack(0).fillna(0)
    top_cats = share.max(axis=1).sort_values(ascending=False).head(10).index
    res["share_categorias_mandato"] = share.loc[top_cats].round(1).reset_index().to_dict("records")
    # checagens
    dup = lula[lula.duplicated(["data", "fornecedor", "valor", "cpf_servidor"], keep=False)]
    res["lula12_dup_mesmo_dia_valor"] = {"n": int(len(dup)), "valor": round(float(dup.valor.sum()), 2)}
    dup_all = h[h.duplicated(["data", "fornecedor", "valor", "cpf_servidor"], keep=False)]
    res["dup_por_mandato_pct"] = (dup_all.groupby("mandato").valor.sum() / h.groupby("mandato").valor.sum() * 100) \
        .round(1).to_dict()
    fds = lula[lula.data.dt.dayofweek >= 5]
    res["lula12_fim_semana"] = {"n": int(len(fds)), "nominal": round(float(fds.valor.sum()), 2)}
    res["lula12_portadores"] = int(lula.cpf_servidor.nunique())
    neg = h[h.valor < 0]
    res["hist_valores_negativos"] = {"n": int(len(neg)), "valor": round(float(neg.valor.sum()), 2)}
    res["hist_sem_fornecedor"] = int((h.fornecedor == "").sum())

    # ---------- Portal da Transparência 2019–2026
    p = load_portal()
    p["periodo"] = pd.PeriodIndex.from_fields(year=p.ano, month=p.mes, freq="M")
    p["valor_real"] = p.valor * p.periodo.map(fator)
    pres = p[p.ug.isin(UG_PRESIDENTE)]
    res["portal_ug_ano"] = pres.groupby(["ano"]).agg(nominal=("valor", "sum"), real=("valor_real", "sum"),
                                                    n=("valor", "count")).round(2).reset_index().to_dict("records")
    res["portal_orgao_pr_ano"] = p.groupby(["ano", "ug_nome"]).valor.sum().round(2).unstack(fill_value=0) \
        .reset_index().to_dict("records")
    res["portal_transacoes"] = pres.groupby(["ano", "transacao"]).valor.sum().round(2).unstack(fill_value=0) \
        .reset_index().to_dict("records")
    sig = pres[pres.favorecido.str.contains("SIGIL") | pres["NOME PORTADOR"].str.contains("Sigil", case=False)]
    res["portal_sigiloso_ano"] = sig.groupby("ano").valor.sum().round(2).to_dict()
    res["portal_sigiloso_exemplo"] = sig.head(3)[["NOME PORTADOR", "NOME FAVORECIDO", "TRANSAÇÃO", "valor"]] \
        .to_dict("records")
    l3 = pres[pres.ano >= 2023]
    aberto = l3[~l3.index.isin(sig.index)]
    f3 = aberto.groupby("favorecido").agg(valor=("valor", "sum"), n=("valor", "count")) \
        .sort_values("valor", ascending=False)
    res["lula3_fornecedores"] = f3.head(25).round(2).reset_index().to_dict("records")
    b3 = aberto.sort_values("valor", ascending=False).head(25)
    res["lula3_maiores"] = b3.assign(data=b3.data.dt.strftime("%Y-%m-%d"))[
        ["ano", "mes", "data", "ug_nome", "NOME PORTADOR", "favorecido", "transacao", "valor"]].to_dict("records")
    saq3 = l3[l3.transacao.str.contains("SAQUE", case=False)]
    res["lula3_saques"] = {"n": int(len(saq3)), "valor": round(float(saq3.valor.sum()), 2),
                           "por_ano": saq3.groupby("ano").valor.sum().round(2).to_dict()}
    res["lula3_portadores"] = int(l3["CPF PORTADOR"].nunique())
    dup3 = l3[l3.duplicated(["data", "favorecido", "valor", "CPF PORTADOR"], keep=False) & ~l3.index.isin(sig.index)]
    res["lula3_dup"] = {"n": int(len(dup3)), "valor": round(float(dup3.valor.sum()), 2),
                        "top": dup3.groupby("favorecido").valor.sum().sort_values(ascending=False).head(10)
                        .round(2).to_dict()}
    # calibração: o mesmo ano nas duas bases (2019-2022)
    cal = []
    for a in range(2019, 2023):
        cal.append({"ano": a, "suprim": round(float(h[h.ano == a].valor.sum()), 2),
                    "portal_ugs_pr": round(float(pres[pres.ano == a].valor.sum()), 2)})
    res["calibracao"] = cal
    pres.to_csv(OUT / "cpgf_presidencia_2019_2026.csv", index=False)
    (OUT / "cartao_resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=str))
    print(json.dumps(res, ensure_ascii=False, indent=1, default=str)[:20000])


if __name__ == "__main__":
    main()
