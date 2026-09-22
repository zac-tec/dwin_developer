import sharp from "sharp";
import { zipSync, strToU8 } from "fflate";
export async function exportImages(project, orderedPages, size, quality) {
  const files = {};
  const manifest = {
    formatVersion: 1,
    target: "DGUS II background source images",
    width: size.width,
    height: size.height,
    quality,
    iclGenerated: false,
    pages: [],
  };
  for (const [index, id] of orderedPages.entries()) {
    const page = project.rendered.find((p) => p.id === id);
    if (!page) throw new Error("A selected page has not been rendered.");
    const name = String(index).padStart(3, "0");
    files[`images/${name}.png`] = page.png;
    const jpeg = await sharp(page.png)
      .jpeg({ quality, chromaSubsampling: "4:4:4", progressive: false })
      .toBuffer();
    files[`images/${name}.jpg`] = jpeg;
    manifest.pages.push({
      index,
      source: page.source,
      title: page.title,
      jpegBytes: jpeg.length,
      warnings: page.warnings,
    });
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["DWIN_SET/README.txt"] = strToU8(
    "No ICL has been generated. This is NOT a flash-ready package.\nUse the numbered images with the official DWIN DGUS ICL generator, save its output as 32.icl in this folder, and validate it for your display.\n",
  );
  files["NEXT-STEPS.txt"] = strToU8(
    "DWIN Developer — background image source package\n\n1. Check images/000.png, 001.png, etc. at actual screen size.\n2. Open the ICL generator in the official DWIN DGUS tool.\n3. Add the numbered images in manifest order. Use either PNG or JPG, not both.\n4. Generate 32.icl into DWIN_SET. Check image-size limits for your exact model.\n5. Configure the background library selection for file 32 in your device project.\n6. Add touch/page configuration separately and test on your display.\n\nPNG files are lossless sources. JPG files use baseline JPEG with 4:4:4 sampling. The DWIN generator may re-encode them.\nText is baked into images. Native fonts, touch controls, URL import and automatic layout adaptation are outside this version.\n",
  );
  return zipSync(files, { level: 1 });
}
