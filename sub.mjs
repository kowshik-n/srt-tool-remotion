import {
  existsSync,
  writeFileSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "path";

function timeToMs(timeString) {
  const [hours, minutes, seconds] = timeString.split(':');
  const [secs, ms] = seconds.split(',');
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(secs) * 1000 +
    parseInt(ms)
  );
}

function parseSrt(srtContent) {
  const subtitles = [];
  const blocks = srtContent.trim().split('\n\n');

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    const [startTime, endTime] = timeLine.split(' --> ');
    
    // Split the text into words and handle each word separately
    const words = lines.slice(2).join(' ').trim().split(' ');
    
    for (const word of words) {
      const startMs = timeToMs(startTime);
      const endMs = timeToMs(endTime);
      
      subtitles.push({
        text: ` ${word}`,
        startMs,
        endMs,
        timestampMs: Math.floor((startMs + endMs) / 2),
        confidence: Math.random() * (1 - 0.5) + 0.5
      });
    }
  }

  return subtitles;
}

const subFile = async (filePath, fileName) => {
  // Output directly to public folder with same name as video
  const outPath = path.join(
    process.cwd(),
    "public",
    fileName.replace(".srt", ".json")
  );

  const srtContent = readFileSync(filePath, 'utf-8');
  const captions = parseSrt(srtContent);
  
  // Write JSON without extra newlines
  writeFileSync(outPath, JSON.stringify(captions, null, 2));
};

const processFile = async (fullPath, entry, directory) => {
  if (!fullPath.endsWith(".srt")) {
    return;
  }

  const outPath = path.join(
    process.cwd(),
    "public",
    entry.replace(".srt", ".json")
  );

  if (existsSync(outPath)) {
    console.log("JSON file already exists:", outPath);
    return;
  }

  console.log("Processing SRT file:", entry);
  await subFile(fullPath, entry);
};

const processDirectory = async (directory) => {
  const entries = readdirSync(directory).filter((f) => f !== ".DS_Store");

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stat = lstatSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else {
      await processFile(fullPath, entry, directory);
    }
  }
};

// Main execution
const hasArgs = process.argv.length > 2;

if (!hasArgs) {
  await processDirectory(path.join(process.cwd(), "public"));
  process.exit(0);
}

for (const arg of process.argv.slice(2)) {
  const fullPath = path.join(process.cwd(), arg);
  const stat = lstatSync(fullPath);

  if (stat.isDirectory()) {
    await processDirectory(fullPath);
    continue;
  }

  console.log(`Processing file ${fullPath}`);
  const directory = path.dirname(fullPath);
  const fileName = path.basename(fullPath);
  await processFile(fullPath, fileName, directory);
}
