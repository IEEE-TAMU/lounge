{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs =
    { flake-parts, ... }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" ];

      perSystem =
        {
          lib,
          config,
          pkgs,
          ...
        }:
        let
          lounge = pkgs.callPackage ./package.nix { };
        in
        {
          formatter = pkgs.nixfmt;
          devShells.default = import ./shell.nix { inherit pkgs; };

          packages = {
            default = lounge;
            inherit lounge;

            docker = pkgs.dockerTools.streamLayeredImage {
              config =
                let
                  port = 3000;
                in
                {
                  WorkingDir = "/share/lounge";
                  Cmd = [
                    (lib.getExe pkgs.nodejs-slim)
                    "server.js"
                  ];
                  ExposedPorts = {
                    "${toString port}/tcp" = { };
                  };
                  Env = [
                    "PORT=${toString port}"
                    "NODE_ENV=production"
                    "NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
                  ];
                };

              name = "lounge";
              tag = "latest";

              contents = pkgs.buildEnv {
                name = "image-root";
                paths = [ lounge ];
              };
            };
          };

          apps = {
            default = config.apps.lounge;
            lounge.program = pkgs.writeShellApplication {
              name = "lounge";
              runtimeInputs = [ pkgs.nodejs-slim ];
              text = "node ${lounge}/share/lounge/server.js";
            };
          };
        };
    };
}
