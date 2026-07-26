declare module 'three/examples/jsm/exporters/GLTFExporter' {
  interface GLTFExporterOptions {
    binary?: boolean
    trs?: boolean
    onlyVisible?: boolean
    includeCustomExtensions?: boolean
  }

  export class GLTFExporter {
    parse(
      input: THREE.Object3D | THREE.Object3D[],
      onDone: (result: ArrayBuffer | { [key: string]: unknown }) => void,
      onError: (error: Error) => void,
      options?: GLTFExporterOptions,
    ): void
  }
}
