declare module 'pdf-parse/lib/pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    IsCollectionPresent?: boolean;
    IsSignaturesPresent?: boolean;
    Author?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    Title?: string;
    Subject?: string;
    Keywords?: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    text: string;
    version: string;
  }

  function PDFParse(
    dataBuffer: Buffer,
    options?: {
      pagerender?: (pageData: any) => string;
      max?: number;
    }
  ): Promise<PDFData>;

  export default PDFParse;
}

declare module 'pdf-parse' {
  export * from 'pdf-parse/lib/pdf-parse';
  export { default } from 'pdf-parse/lib/pdf-parse';
} 