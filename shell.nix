{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShellNoCC {
  packages = [
    pkgs.nodejs_24
    pkgs.prettier
    pkgs.treefmt
  ];
}
