@echo off
REM Lote noturno: agende no Agendador de Tarefas do Windows (ex.: todo dia 01:00).
cd /d "%~dp0"
python fabrica.py >> logs\agendador.txt 2>&1
