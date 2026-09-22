# ICL validation boundary

`32.icl` is a binary image library, not a folder, renamed ZIP, or renamed JPEG. The numeric ID identifies its intended resource location. Generating it and configuring the display to use it are separate steps.

The official T5L DGUS II guide describes using the DGUS generator to create background ICL libraries. It also describes platform-dependent image limits and background-library configuration. The documentation reviewed so far does not provide enough verified binary detail to implement a trustworthy encoder here.

Source: https://forums.dwin-global.com/wp-content/uploads/2023/10/T5L_DGUSII-Application-Development-Guide-2022331.pdf (section 3.3.2.1). Official tools: https://www.dwin-global.com/tool-page/

## What we need next

1. Exact display model, controller generation and kernel version.
2. Official DGUS generator version.
3. Tiny reference projects with one image, then two differently sized/compressed images, plus their generated ICL files.
4. Confirm headers, image directory, addressing, alignment, compression, padding, flash constraints and ordering using those reference files.
5. Independently decode and compare every packed image.
6. Validate the result using the official tool and a physical display.

Until that work is complete, this app exports numbered source images and clear instructions. It must not advertise its ZIP as flash-ready or silently substitute another DWIN ICO format.
