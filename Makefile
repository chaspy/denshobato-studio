.PHONY: dev build test clean install

PREVIEW_PORT ?= 39483

install:
	pnpm install

build:
	pnpm build

dev:
	@printf '%s\n' \
		'Denshobato Studio: http://localhost:$(PREVIEW_PORT)/dev' \
		'Default preview port: $(PREVIEW_PORT)' \
		'Override the preview port from Studio settings if your app runs elsewhere.'
	pnpm build
	pnpm example:dev

test:
	pnpm turbo run test --concurrency=1

clean:
	pnpm clean
