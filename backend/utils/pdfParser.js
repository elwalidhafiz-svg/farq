/**
 * Parse Arabic advertising script PDF text into scenes.
 * Tries multiple strategies to handle different PDF layouts.
 */
function parseArabicScript(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  // Clean up text
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strategy 1: Look for الصورة and الصوت keywords to identify scene blocks
  const scenes1 = parseByArabicKeywords(text);
  if (scenes1.length > 0) {
    return scenes1;
  }

  // Strategy 2: Look for numbered scenes (Arabic or Western numerals)
  const scenes2 = parseByNumberedScenes(text);
  if (scenes2.length > 0) {
    return scenes2;
  }

  // Strategy 3: Fallback — split into equal chunks
  return parseByChunks(text);
}

function parseByArabicKeywords(text) {
  const scenes = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Find blocks containing الصورة (visual) and الصوت (audio)
  let currentScene = null;
  let sceneCounter = 1;
  let captureMode = null; // 'visual' | 'audio' | null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect scene number markers (digits at start of line, possibly Arabic numerals)
    const sceneNumMatch = line.match(/^[١٢٣٤٥٦٧٨٩٠\d]+$/) ||
      line.match(/^مشهد\s*[١٢٣٤٥٦٧٨٩٠\d]+/) ||
      line.match(/^لقطة\s*[١٢٣٤٥٦٧٨٩٠\d]+/) ||
      line.match(/^Scene\s*\d+/i);

    if (sceneNumMatch) {
      if (currentScene) {
        scenes.push(finalizeScene(currentScene, sceneCounter - 1));
      }
      currentScene = { sceneNumber: sceneCounter++, visualLines: [], audioLines: [] };
      captureMode = null;
      continue;
    }

    // Detect visual description keyword
    if (line.includes('الصورة') || line.includes('وصف الصورة') || line.includes('المشهد البصري')) {
      if (!currentScene) {
        currentScene = { sceneNumber: sceneCounter++, visualLines: [], audioLines: [] };
      }
      captureMode = 'visual';
      // Check if there's content after the keyword on the same line
      const afterKeyword = line.replace(/.*الصورة[:\s]*/, '').trim();
      if (afterKeyword) currentScene.visualLines.push(afterKeyword);
      continue;
    }

    // Detect audio description keyword
    if (line.includes('الصوت') || line.includes('الصوت/النص') || line.includes('النص') || line.includes('الكلام')) {
      if (!currentScene) {
        currentScene = { sceneNumber: sceneCounter++, visualLines: [], audioLines: [] };
      }
      captureMode = 'audio';
      const afterKeyword = line.replace(/.*الصوت[:\s]*/, '').replace(/.*النص[:\s]*/, '').trim();
      if (afterKeyword) currentScene.audioLines.push(afterKeyword);
      continue;
    }

    // Accumulate content
    if (currentScene && captureMode === 'visual') {
      currentScene.visualLines.push(line);
    } else if (currentScene && captureMode === 'audio') {
      currentScene.audioLines.push(line);
    } else if (!currentScene && line.length > 10) {
      // Start a new scene from content
      currentScene = { sceneNumber: sceneCounter++, visualLines: [line], audioLines: [] };
      captureMode = 'visual';
    }
  }

  if (currentScene) {
    scenes.push(finalizeScene(currentScene, currentScene.sceneNumber));
  }

  // Only return if we found meaningful scenes with both visual and audio
  const meaningful = scenes.filter(s => s.visualDescription.length > 5);
  return meaningful.length >= 1 ? meaningful : [];
}

function parseByNumberedScenes(text) {
  const scenes = [];

  // Split on scene number patterns: "١" or "1" at start of line or after newline
  // Also handle "مشهد ١" or "لقطة ١"
  const scenePattern = /(?:^|\n)(?:مشهد|لقطة|Scene)?\s*([١٢٣٤٥٦٧٨٩٠\d]+)\s*\n/gi;

  const matches = [...text.matchAll(scenePattern)];

  if (matches.length < 2) return [];

  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index + matches[i][0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const block = text.slice(startIdx, endIdx).trim();

    const sceneNum = toWesternNumerals(matches[i][1]);
    const { visual, audio } = splitVisualAudio(block);

    scenes.push({
      sceneNumber: parseInt(sceneNum) || (i + 1),
      visualDescription: visual,
      audioDescription: audio,
    });
  }

  return scenes.filter(s => s.visualDescription.length > 0);
}

function parseByChunks(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  if (lines.length === 0) return [];

  // Determine chunk size — aim for ~3-8 scenes
  const targetScenes = Math.max(3, Math.min(8, Math.floor(lines.length / 4)));
  const chunkSize = Math.ceil(lines.length / targetScenes);

  const scenes = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const mid = Math.floor(chunk.length / 2);
    const sceneNum = Math.floor(i / chunkSize) + 1;

    scenes.push({
      sceneNumber: sceneNum,
      visualDescription: chunk.slice(0, mid).join(' ').trim(),
      audioDescription: chunk.slice(mid).join(' ').trim(),
    });
  }

  return scenes;
}

function finalizeScene(scene, num) {
  return {
    sceneNumber: num,
    visualDescription: scene.visualLines.join(' ').trim(),
    audioDescription: scene.audioLines.join(' ').trim(),
  };
}

function splitVisualAudio(block) {
  // Try to split block at الصوت keyword
  const audioIdx = block.search(/الصوت|الكلام|النص المسموع/);
  const visualIdx = block.search(/الصورة|المشهد/);

  if (audioIdx > -1 && visualIdx > -1) {
    if (visualIdx < audioIdx) {
      return {
        visual: block.slice(visualIdx, audioIdx).replace(/الصورة[:\s]*/g, '').trim(),
        audio: block.slice(audioIdx).replace(/الصوت[:\s]*/g, '').trim(),
      };
    } else {
      return {
        visual: block.slice(audioIdx > 0 ? audioIdx : 0).replace(/الصورة[:\s]*/g, '').trim(),
        audio: block.slice(0, audioIdx).replace(/الصوت[:\s]*/g, '').trim(),
      };
    }
  } else if (audioIdx > -1) {
    return {
      visual: block.slice(0, audioIdx).trim(),
      audio: block.slice(audioIdx).replace(/الصوت[:\s]*/g, '').trim(),
    };
  } else if (visualIdx > -1) {
    return {
      visual: block.replace(/الصورة[:\s]*/g, '').trim(),
      audio: '',
    };
  }

  // No keywords — split in half
  const mid = Math.floor(block.length / 2);
  const splitPoint = block.indexOf('\n', mid);
  const split = splitPoint > -1 ? splitPoint : mid;
  return {
    visual: block.slice(0, split).trim(),
    audio: block.slice(split).trim(),
  };
}

function toWesternNumerals(str) {
  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  return str.replace(/[٠-٩]/g, d => map[d] || d);
}

module.exports = { parseArabicScript };
