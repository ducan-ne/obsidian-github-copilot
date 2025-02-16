import { Editor, MarkdownFileInfo, MarkdownView, TFile } from "obsidian";
import { EditorView } from "@codemirror/view";
import Cacher from "./copilot/Cacher";
import { InlineSuggestionEffect } from "./extensions/InlineSuggestionState";
import CopilotPlugin from "./main";
import Vault from "./helpers/Vault";

class EventListener {
	private plugin: CopilotPlugin;
	private vault: Vault;

	constructor(plugin: CopilotPlugin) {
		this.plugin = plugin;
		this.vault = new Vault();
	}

	public async onFileOpen(file: TFile | null): Promise<void> {
		const basePath = this.vault.getBasePath(this.plugin.app);
		const content = await file?.vault.read(file);

		const didOpenParams = {
			textDocument: {
				uri: `file://${basePath}/${file?.path}`,
				languageId: "markdown",
				version: Cacher.getInstance().getCache(file?.path || ""),
				text: content || "",
			},
		};

		await this.plugin.copilotAgent.getClient().openDocument(didOpenParams);
	}

	public async onEditorChange(
		editor: Editor,
		info: MarkdownView | MarkdownFileInfo,
	): Promise<void> {
		const basePath = this.vault.getBasePath(this.plugin.app);
		const cursor = editor.getCursor();

		const file = info?.file;
		if (!file) {
			return;
		}

		const version = Cacher.getInstance().getCache(file.path);
		Cacher.getInstance().updateCache(file.path, version + 1);

		const content = (info as MarkdownView).data;
		const didChangeParams = {
			textDocument: {
				uri: `file://${basePath}/${file.path}`,
				version: Cacher.getInstance().getCache(file.path),
			},
			contentChanges: [
				{
					text: content,
				},
			],
		};

		await this.plugin.copilotAgent.getClient().didChange(didChangeParams);

		const conpletionParams = {
			doc: {
				tabSize: 2,
				indentSize: 2,
				insertSpaces: true,
				uri: `file://${basePath}/${file.path}`,
				relativePath: file.path,
				position: {
					line: cursor.line,
					character: cursor.ch,
				},
				version: Cacher.getInstance().getCache(file.path),
			},
		};

		const res = await this.plugin.copilotAgent
			.getClient()
			.completion(conpletionParams);

		if (res && res.completions && res.completions.length > 0) {
			const completion = res.completions[0].displayText;
			// @ts-expect-error, not typed
			const editorView = editor.cm as EditorView;
			editorView.dispatch({
				effects: [
					InlineSuggestionEffect.of({
						suggestion: completion,
					}),
				],
			});
		}
	}
}

export default EventListener;
