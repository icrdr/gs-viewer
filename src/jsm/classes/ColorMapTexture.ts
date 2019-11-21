import { CanvasTexture, LinearFilter } from "three";

interface colorMapPoint {
  color: string;
  pos: number;
}

export class ColorMapTexture extends CanvasTexture {
  protected _colorMapData: Array<colorMapPoint>;

  constructor(colorMapData: Array<colorMapPoint>=[
    { color: "#000", pos: 0 },
    { color: "#fff", pos: 1 }
  ]) {
    super(document.createElement("canvas"));

    this._colorMapData = colorMapData
    
    this.image.width = 512;
    this.image.height = 1;
    this.updateCtx();
    this.minFilter = LinearFilter;
    this.needsUpdate = true;
  }

  updateCtx = () => {
    const ctx = this.image.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 512, 0);

    this._colorMapData.forEach(e => {
      gradient.addColorStop(e.pos, e.color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 1);
  };

  get colorMapData() {
    return this._colorMapData;
  }

  set colorMapData(value) {
    this._colorMapData = value;
    this.updateCtx();
    this.needsUpdate = true;
  }

}