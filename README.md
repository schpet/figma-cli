# figma cli

a command line tool to copy figma nodes as images to your clipboard.

currently, it has three commands:

```bash
# copy a figma node to your clipboard
figma node copy "https://www.figma.com/design/FILE_ID/DESIGN_NAME?node-id=NODE_ID&t=HASH"

# export a figma node to a file
figma node export "https://www.figma.com/design/FILE_ID/DESIGN_NAME?node-id=NODE_ID&t=HASH"

# get the direct image URL for a figma node
figma node url "https://www.figma.com/design/FILE_ID/DESIGN_NAME?node-id=NODE_ID&t=HASH"
```

## installation

1. [install deno](https://docs.deno.com/runtime/getting_started/installation/)
2. install the package
   ```bash
   deno install -A -g --force jsr:@schpet/figma-cli
   ```

it should be available on your $PATH, if that fails, check
[deno's docs](https://docs.deno.com/runtime/reference/cli/install/).

### development installation

if you're working from source:

```bash
deno task install
```

## setup

### 1. get a figma personal access token

1. go to figma and click on your profile picture in the top right
2. select "settings" from the dropdown
3. scroll down to the "personal access tokens" section
4. click "create new token"
5. give it a name (like "figma-cli")
6. set the expiration (max 90 days currently)
7. copy the token that starts with `figd_`

### 2. set environment variable

add your token to your shell profile:

**bash/zsh (.bashrc, .zshrc, or .profile):**

```bash
export FIGMA_PERSONAL_ACCESS_TOKEN="figd_your_token_here"
```

after adding it, reload your shell:

```bash
source ~/.bashrc  # or ~/.zshrc, ~/.profile
```

**fish:**

```fish
set -Ux FIGMA_PERSONAL_ACCESS_TOKEN "figd_your_token_here"
```

## usage

### copy a figma node

```bash
figma node copy "https://www.figma.com/design/FILE_ID/DESIGN_NAME?node-id=NODE_ID&t=HASH"
```

this will:

1. download the image to a temporary directory
2. copy it to your clipboard (macos only)
3. show you where the file was saved

## commands

- `figma node copy <url>` - copy a figma node as an image to clipboard
- `figma node export <url>` - export a figma node to a temporary file
- `figma node url <url>` - get the direct image URL for a figma node
- `figma --help` - show help information
- `figma node --help` - show node command help

## requirements

- deno
- macos (for clipboard functionality - images are still downloaded on other
  platforms)
- figma personal access token
