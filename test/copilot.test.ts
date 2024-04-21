import { expect, test } from "@jest/globals";
import { JSONRPCEndpoint, LspClient } from "@pierrad/ts-lsp-client";
import { spawn } from "child_process";

test("test copilot lsp", async () => {
	const agent = spawn("node", ["./copilot/agent.js", "--stdio"], {
		shell: true,
		stdio: "pipe",
	});

	const endpoint = new JSONRPCEndpoint(agent.stdin, agent.stdout);
	const client = new LspClient(endpoint);

	const initializeParams = {
		processId: agent.pid as number,
		capabilities: {
			copilot: {
				openURL: true,
			},
		},
		clientInfo: {
			name: "ObsidianCopilot",
			version: "0.0.1",
		},
		rootUri: "file://",
		initializationOptions: {},
	};
	// @ts-expect-error - we're not using all the capabilities
	const res = await client.initialize(initializeParams);
	expect(res).toBeDefined();
	expect(res).toHaveProperty("capabilities");
	expect(res).toHaveProperty("serverInfo");
	client.exit();
});
