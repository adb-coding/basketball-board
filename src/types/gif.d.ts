declare module 'gif.js' {
  interface GifOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    repeat?: number;
  }
  interface FrameOptions {
    delay?: number;
    copy?: boolean;
  }
  export default class GIF {
    constructor(options?: GifOptions);
    addFrame(
      element: HTMLCanvasElement | CanvasRenderingContext2D | ImageData,
      options?: FrameOptions,
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    render(): void;
    abort(): void;
  }
}
