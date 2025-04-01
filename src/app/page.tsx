// Editor de Imagem com Camadas e IA (versão inicial)
// Frontend em React com suporte a camadas: Fundo, Personagem, Texto

import React, { useState } from "react";

export default function LayeredEditor() {
  const [background, setBackground] = useState(null);
  const [character, setCharacter] = useState(null);
  const [text, setText] = useState("AINDA TENHO FOME");
  const [analysis, setAnalysis] = useState("ANÁLISE ÁLBUM DJONGA");
  const [fontSize, setFontSize] = useState(42);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (type === "background") setBackground(reader.result);
      if (type === "character") setCharacter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <div className="w-full max-w-3xl border bg-black relative h-[600px]">
        {background && (
          <img
            src={background}
            alt="Background"
            className="absolute w-full h-full object-cover z-0"
          />
        )}
        {character && (
          <img
            src={character}
            alt="Character"
            className="absolute w-2/3 left-1/2 -translate-x-1/2 bottom-0 z-10"
          />
        )}
        <div
          className="absolute w-full text-center z-20"
          style={{ top: textPosition.y }}
        >
          <h1
            style={{ fontSize: fontSize, color: "#F0DABD" }}
            className="font-bold drop-shadow"
          >
            {text}
          </h1>
          <p
            style={{ fontSize: fontSize * 0.5, color: "#F0DABD" }}
            className="font-medium drop-shadow"
          >
            {analysis}
          </p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <div className="flex flex-col">
          <label className="text-sm mb-1">Upload Fundo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "background")}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Upload Personagem</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "character")}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Texto Principal</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="border p-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Texto Complementar</label>
          <input
            type="text"
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            className="border p-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Tamanho da Fonte</label>
          <input
            type="range"
            min="20"
            max="100"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
