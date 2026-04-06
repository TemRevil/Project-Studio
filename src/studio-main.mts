import React from "react";
import { render } from "ink";
import StudioApp from "./studio/StudioApp.tsx";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stdout.write("Project Studio Ink requires an interactive TTY. Use the headless commands in non-interactive shells.\n");
  process.exit(0);
}

render(React.createElement(StudioApp, { projectRoot: process.cwd() }));
