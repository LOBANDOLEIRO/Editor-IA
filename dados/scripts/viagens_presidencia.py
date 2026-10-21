"""Viagens a serviço (diárias e passagens) da Presidência da República, 2019–2026.

Fonte: https://portaldatransparencia.gov.br/download-de-dados/viagens/{ano}
Baixa cada ano, filtra o órgão superior Presidência da República e apaga o zip.
Uso: python3 -I dados/scripts/viagens_presidencia.py
"""
import csv
import io
import json
import re
import subprocess
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TMP = BASE / "raw" / "viagens"
OUT = BASE / "out"
TMP.mkdir(parents=True, exist_ok=True)


def num(s):
    return float((s or "0").replace(".", "").replace(",", ".") or 0)


def main():
    res = {}
    for ano in range(2019, 2027):
        z = TMP / f"{ano}.zip"
        if not z.exists():
            subprocess.run(["curl", "-sS", "-L", "-m", "900", "-o", str(z),
                            f"https://portaldatransparencia.gov.br/download-de-dados/viagens/{ano}"], check=True)
        tot = {"viagens": 0, "diarias": 0.0, "passagens": 0.0, "outros": 0.0, "devolucao": 0.0,
               "por_orgao": {}, "internacionais": 0, "valor_internacional": 0.0, "top": []}
        with zipfile.ZipFile(z) as zf:
            nome = next(n for n in zf.namelist() if n.endswith("_Viagem.csv"))
            for r in csv.DictReader(io.TextIOWrapper(zf.open(nome), encoding="latin1"), delimiter=";"):
                if r.get("Nome do órgão superior") != "Presidência da República":
                    continue
                d, p, o, dv = (num(r.get("Valor diárias")), num(r.get("Valor passagens")),
                               num(r.get("Valor outros gastos")), num(r.get("Valor devolução")))
                tot["viagens"] += 1
                tot["diarias"] += d
                tot["passagens"] += p
                tot["outros"] += o
                tot["devolucao"] += dv
                org = r.get("Nome órgão solicitante") or ""
                tot["por_orgao"][org] = tot["por_orgao"].get(org, 0) + d + p + o
                destino = r.get("Destinos") or ""
                if destino and not all(re.search(r"/[A-Z]{2}$", x.strip()) for x in destino.split(",")):
                    tot["internacionais"] += 1
                    tot["valor_internacional"] += d + p + o
                tot["top"].append((d + p + o, r.get("Período - Data de início"), destino[:80],
                                   (r.get("Motivo") or "")[:120], org, r.get("Situação")))
        tot["top"] = sorted(tot["top"], reverse=True)[:10]
        tot["por_orgao"] = dict(sorted(tot["por_orgao"].items(), key=lambda x: -x[1])[:8])
        res[ano] = tot
        z.unlink()
        print(ano, tot["viagens"], round(tot["diarias"]), round(tot["passagens"]), round(tot["outros"]), flush=True)
    (OUT / "viagens_presidencia.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=str))


if __name__ == "__main__":
    main()
