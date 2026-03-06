.PHONY: dev build test clean install

install:
	pnpm install

build:
	pnpm build

dev:
	pnpm build && pnpm example:dev

test:
	pnpm turbo run test --concurrency=1

clean:
	pnpm clean
