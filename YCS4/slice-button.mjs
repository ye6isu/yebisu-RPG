import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const generatedDirectory = new URL("./assets/sprite/generated/", import.meta.url);
mkdirSync(generatedDirectory, { recursive: true });

const generatedPath = fileName => new URL(fileName, generatedDirectory);

const paeth = (left, up, upperLeft) => {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
};

const decodeRgbaPng = sourcePath => {
  const source = readFileSync(sourcePath);
  if (!source.subarray(0, 8).equals(signature)) {
    throw new Error(`${sourcePath.pathname} must be a PNG file.`);
  }

  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const compressedParts = [];

  for (let offset = 8; offset < source.length; ) {
    const length = source.readUInt32BE(offset);
    const type = source.toString("ascii", offset + 4, offset + 8);
    const data = source.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      compressedParts.push(data);
    }

    offset += length + 12;
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`${sourcePath.pathname} must be a non-interlaced, 8-bit RGBA PNG.`);
  }

  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressedParts));
  const pixels = Buffer.alloc(rowLength * height);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[inputOffset];
    inputOffset += 1;

    for (let x = 0; x < rowLength; x += 1) {
      const raw = filtered[inputOffset + x];
      const outputOffset = y * rowLength + x;
      const left = x >= bytesPerPixel ? pixels[outputOffset - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[outputOffset - rowLength] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[outputOffset - rowLength - bytesPerPixel]
        : 0;

      if (filter === 0) pixels[outputOffset] = raw;
      else if (filter === 1) pixels[outputOffset] = raw + left;
      else if (filter === 2) pixels[outputOffset] = raw + up;
      else if (filter === 3) pixels[outputOffset] = raw + Math.floor((left + up) / 2);
      else if (filter === 4) pixels[outputOffset] = raw + paeth(left, up, upperLeft);
      else throw new Error(`Unsupported PNG row filter: ${filter}.`);
    }

    inputOffset += rowLength;
  }

  return { width, height, pixels };
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type, "ascii");
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return result;
};

const encodeFrame = (sheet, startX, frameWidth, frameHeight, scale) => {
  const bytesPerPixel = 4;
  const sourceRowLength = sheet.width * bytesPerPixel;
  const outputWidth = frameWidth * scale;
  const outputHeight = frameHeight * scale;
  const outputRowLength = outputWidth * bytesPerPixel;
  const scanlines = Buffer.alloc((outputRowLength + 1) * outputHeight);

  for (let y = 0; y < outputHeight; y += 1) {
    const scanlineOffset = y * (outputRowLength + 1) + 1;
    const sourceY = Math.floor(y / scale);

    for (let x = 0; x < outputWidth; x += 1) {
      const sourceX = startX + Math.floor(x / scale);
      const sourceOffset = sourceY * sourceRowLength + sourceX * bytesPerPixel;
      const outputOffset = scanlineOffset + x * bytesPerPixel;
      sheet.pixels.copy(scanlines, outputOffset, sourceOffset, sourceOffset + bytesPerPixel);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(outputWidth, 0);
  header.writeUInt32BE(outputHeight, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const splitTwoFrameSheet = (
  sourceName,
  firstOutputName,
  secondOutputName,
  frameWidth = 16,
  frameHeight = 16,
  scale = 1,
) => {
  const sourcePath = new URL(`./assets/sprite/${sourceName}`, import.meta.url);
  const sheet = decodeRgbaPng(sourcePath);
  if (sheet.width !== frameWidth * 2 || sheet.height !== frameHeight) {
    throw new Error(
      `Expected ${sourceName} to be ${frameWidth * 2}x${frameHeight}, got ${sheet.width}x${sheet.height}.`,
    );
  }

  writeFileSync(
    generatedPath(firstOutputName),
    encodeFrame(sheet, 0, frameWidth, frameHeight, scale),
  );
  writeFileSync(
    generatedPath(secondOutputName),
    encodeFrame(sheet, frameWidth, frameWidth, frameHeight, scale),
  );
};

const scaleSingleFrame = (sourceName, outputName, frameWidth, frameHeight, scale) => {
  const sourcePath = new URL(`./assets/sprite/${sourceName}`, import.meta.url);
  const frame = decodeRgbaPng(sourcePath);
  if (frame.width !== frameWidth || frame.height !== frameHeight) {
    throw new Error(
      `Expected ${sourceName} to be ${frameWidth}x${frameHeight}, got ${frame.width}x${frame.height}.`,
    );
  }

  writeFileSync(
    generatedPath(outputName),
    encodeFrame(frame, 0, frameWidth, frameHeight, scale),
  );
};

const splitVariableWidthSheet = (sourceName, frameHeight, scale, frames) => {
  const sourcePath = new URL(`./assets/sprite/${sourceName}`, import.meta.url);
  const sheet = decodeRgbaPng(sourcePath);
  const expectedWidth = frames.reduce((total, frame) => total + frame.width, 0);
  if (sheet.width !== expectedWidth || sheet.height !== frameHeight) {
    throw new Error(
      `Expected ${sourceName} to be ${expectedWidth}x${frameHeight}, got ${sheet.width}x${sheet.height}.`,
    );
  }

  let startX = 0;
  for (const frame of frames) {
    writeFileSync(
      generatedPath(frame.outputName),
      encodeFrame(sheet, startX, frame.width, frameHeight, scale),
    );
    startX += frame.width;
  }
};

splitVariableWidthSheet("button.png", 16, 2, [
  { width: 16, outputName: "button_normal.png" },
  { width: 16, outputName: "button_hovered.png" },
  { width: 16, outputName: "button_toggled.png" },
  { width: 16, outputName: "button_toggled_hovered.png" },
]);
splitTwoFrameSheet("window.png", "window_title.png", "window_body.png", 16, 16, 2);
scaleSingleFrame("option_container.png", "option_container_2x.png", 16, 16, 2);
scaleSingleFrame("dialogue_icon.png", "dialogue_icon_2x.png", 5, 5, 2);
splitTwoFrameSheet(
  "dialogue_button.png",
  "dialogue_button_normal.png",
  "dialogue_button_hovered.png",
  9,
  10,
  2,
);
splitTwoFrameSheet(
  "tab_container.png",
  "tab_active.png",
  "tab_inactive.png",
  16,
  16,
  2,
);
scaleSingleFrame(
  "tab_workspace_container.png",
  "tab_workspace_container_2x.png",
  16,
  16,
  2,
);
scaleSingleFrame("tab_icon.png", "tab_icon_2x.png", 8, 8, 2);
scaleSingleFrame("container_1.png", "container_1_2x.png", 3, 3, 2);
scaleSingleFrame("preview.png", "preview_2x.png", 7, 7, 2);
scaleSingleFrame("text_box.png", "text_box_2x.png", 16, 16, 2);
splitTwoFrameSheet(
  "checkbox.png",
  "checkbox_empty_2x.png",
  "checkbox_ticked_2x.png",
  9,
  9,
  2,
);
splitTwoFrameSheet(
  "value_slider.png",
  "value_slider_filled_2x.png",
  "value_slider_empty_2x.png",
  16,
  16,
  2,
);
splitTwoFrameSheet(
  "hex.png",
  "hex_frame_2x.png",
  "hex_background_2x.png",
  16,
  16,
  2,
);
scaleSingleFrame(
  "horizontal_divider.png",
  "horizontal_divider_2x.png",
  3,
  1,
  2,
);
scaleSingleFrame(
  "vertical_divider.png",
  "vertical_divider_2x.png",
  1,
  3,
  2,
);
splitVariableWidthSheet("direction.png", 9, 2, [
  { width: 5, outputName: "direction_left_2x.png" },
  { width: 5, outputName: "direction_right_2x.png" },
  { width: 9, outputName: "direction_down_2x.png" },
  { width: 9, outputName: "direction_up_2x.png" },
]);
