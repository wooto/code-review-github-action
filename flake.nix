{
  description = "Code Review GitHub Action - Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js and npm
            nodejs_20

            # Git and pre-commit
            git
            pre-commit

            # Development utilities
            ripgrep
            fd
          ];

          shellHook = ''
            # Set up pre-commit hooks if they don't exist
            if [ ! -f .git/hooks/pre-commit ]; then
              echo "Setting up pre-commit hooks..."
              pre-commit install
              pre-commit install --hook-type commit-msg
            fi

            # Install npm dependencies if node_modules doesn't exist
            if [ ! -d node_modules ]; then
              echo "Installing npm dependencies..."
              npm ci
            fi

            echo "✅ Development environment ready!"
            echo ""
            echo "🔧 Available commands:"
            echo "  npm run build           - Build the project"
            echo "  npm run test            - Run tests"
            echo "  npm run lint            - Run ESLint"
            echo "  npm run lint:fix        - Fix ESLint issues"
            echo "  pre-commit run --all-files  - Run all pre-commit hooks"
            echo ""
            echo "📝 Pre-commit hooks will run automatically on each commit"
          '';
        };
      });
}
