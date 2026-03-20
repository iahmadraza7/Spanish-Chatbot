declare module "pdf-parse" {
  type PdfParseResult = {
    numpages?: number;
    numrender?: number;
    info?: any;
    metadata?: any;
    version?: string;
    text: string;
  };

  function pdf(
    dataBuffer: Buffer | Uint8Array,
    options?: Record<string, any>
  ): Promise<PdfParseResult>;

  export default pdf;
}

