declare module 'pdf-parse' {
  function pdfParse(
    data: Buffer | ArrayBuffer | Uint8Array,
    options?: any
  ): Promise<{ text: string; numpages: number; info?: any }>;
  export default pdfParse;
}
