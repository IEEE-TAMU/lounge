{
  lib,
  buildNpmPackage,
  importNpmLock,
}:
buildNpmPackage (finalAttrs: {
  pname = "lounge";
  version = "0.1.0";

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.intersection (lib.fileset.fromSource (lib.sources.cleanSource ./.)) (
      lib.fileset.unions [
        ./app
        ./components
        ./lib
        ./public
        ./package.json
        ./package-lock.json
        ./next.config.ts
        ./postcss.config.mjs
        ./tsconfig.json
        ./eslint.config.mjs
      ]
    );
  };

  npmDeps = importNpmLock { npmRoot = finalAttrs.src; };
  npmConfigHook = importNpmLock.npmConfigHook;

  installPhase = ''
    runHook preInstall

    mkdir -p $out/share
    cp -r .next/standalone $out/share/lounge
    cp -r public $out/share/lounge/public
    cp -r .next/static $out/share/lounge/.next/static

    runHook postInstall
  '';
})
