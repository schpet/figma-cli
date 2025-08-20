default:
    just -l -u

# tags the newest release in the changelog
tag:
    deno check --all
    deno fmt --check
    deno lint

    svbump write "$(changelog version latest)" version deno.json

    git add deno.json CHANGELOG.md
    git commit -m "chore: Release figma-cli version $(svbump read version deno.json)"
    git tag "v$(svbump read version deno.json)"

    @echo "tagged v$(svbump read version deno.json)"
    @echo
    @echo "run this to release it:"
    @echo
    @echo "  git push origin HEAD --tags"
