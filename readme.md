# Mattermost Pro for OpenClaw

`mattermost-pro` is a private OpenClaw channel plugin derived from the official Mattermost plugin. It keeps Mattermost compatibility while changing a few behaviors for private agent workflows.

This package uses its own plugin id and channel id, so it can be installed next to the official `mattermost` plugin without taking over `channels.mattermost`.

中文说明见下方：[中文说明](#中文说明)。

## Differences From The Official Mattermost Plugin

| Area | Official plugin | `mattermost-pro` |
| --- | --- | --- |
| Plugin id | `mattermost` / `@openclaw/mattermost` | `mattermost-pro` |
| Channel config key | `channels.mattermost` | `channels.mattermost-pro` |
| Message targets | `mattermost:` style targets | `mattermost-pro:` and `mm-pro:` targets |
| Default text chunk limit | Official Mattermost plugin behavior | `14000`, leaving room under Mattermost's server-side post limit |
| `streaming: "block"` | Follows the official channel implementation | Preserves the full in-progress draft history and sends the final answer as a separate normal message |
| Existing thread replies | Official behavior may vary by version | Replies inside an existing Mattermost thread stay in that thread |
| New top-level threads | Controlled by official config | Only created when `replyToMode` is `first`, `all`, or `batched`; `off` preserves existing threads without starting new ones |
| Distribution model | Official OpenClaw plugin | Private standalone source package, built with `pnpm build` and installed with `openclaw plugins install --link` |

Use this plugin when you want the private Mattermost workflow above without changing the official plugin or the `channels.mattermost` config surface.

## Requirements

- Node.js 22 or newer
- pnpm
- OpenClaw `2026.5.26` or newer
- A Mattermost bot token
- A Mattermost server base URL, for example `https://chat.example.com`

## Install From Source

Clone or copy this repository, then install dependencies and build:

```bash
pnpm install
pnpm build
```

The build must produce these runtime files:

```bash
ls dist/index.mjs dist/setup-entry.mjs dist/runtime-api.mjs
```

Link the plugin into OpenClaw:

```bash
openclaw plugins install --link "$(pwd)"
```

Restart the OpenClaw gateway after installing or rebuilding:

```bash
openclaw gateway restart
```

For development, rebuild after source changes and restart the gateway again:

```bash
pnpm build
openclaw gateway restart
```

## Configuration

Use `channels.mattermost-pro`, not `channels.mattermost`.

Minimal config:

```json5
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
```

Apply it with OpenClaw:

```bash
openclaw config patch --stdin <<'EOF'
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
EOF
```

You can also use environment variables for the default account:

```bash
export MATTERMOST_BOT_TOKEN="<MATTERMOST_BOT_TOKEN>"
export MATTERMOST_URL="https://chat.example.com"
```

## Recommended Private Config

This is the config shape this fork was built for:

```json5
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",

      streaming: "block",
      replyToMode: "off",
      textChunkLimit: 14000,

      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
```

Behavior notes:

- `streaming: "block"` edits one draft preview post while the task is running, appends the latest process state to the bottom, keeps the process history, and sends the final answer as a new normal message.
- `replyToMode: "off"` does not create a new thread for top-level channel posts.
- If the incoming Mattermost post is already in a thread, the reply stays in that thread.
- Direct messages ignore `replyToMode`.

## Internal Mattermost Servers

If your Mattermost server is on a private or internal network, opt in explicitly:

```json5
{
  channels: {
    "mattermost-pro": {
      network: {
        dangerouslyAllowPrivateNetwork: true
      }
    }
  }
}
```

Only enable this for Mattermost hosts you control and trust.

## Multi-Account Config

Multiple Mattermost bots can be configured under `accounts`:

```json5
{
  channels: {
    "mattermost-pro": {
      defaultAccount: "default",
      accounts: {
        default: {
          name: "Primary",
          baseUrl: "https://chat.example.com",
          botToken: "<PRIMARY_BOT_TOKEN>",
          streaming: "block",
          replyToMode: "off"
        },
        alerts: {
          name: "Alerts",
          baseUrl: "https://alerts.example.com",
          botToken: "<ALERTS_BOT_TOKEN>",
          streaming: "progress"
        }
      }
    }
  }
}
```

Environment variables only apply to the `default` account.

## Native Slash Commands

Native slash commands are opt-in:

```json5
{
  channels: {
    "mattermost-pro": {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost-pro/command",
        callbackUrl: "https://gateway.example.com/api/channels/mattermost-pro/command"
      }
    }
  }
}
```

The `callbackUrl` must be reachable from the Mattermost server. Do not use `localhost` unless Mattermost and OpenClaw run in the same network namespace.

## Sending Messages

Use the new channel id:

```bash
openclaw message send --channel mattermost-pro --target channel:<channel-id> --text "hello"
```

Targets may also use plugin prefixes where OpenClaw accepts target strings:

```text
mattermost-pro:channel:<channel-id>
mm-pro:channel:<channel-id>
mattermost-pro:<user-id>
```

## Troubleshooting

### `requires compiled runtime output`

Build the plugin before linking:

```bash
pnpm build
ls dist/index.mjs dist/setup-entry.mjs
```

Then reinstall or relink:

```bash
openclaw plugins install --link "$(pwd)"
openclaw gateway restart
```

### No messages are received

Check these first:

```bash
openclaw plugins list
openclaw config get channels.mattermost-pro
openclaw channels status --probe
```

Verify that:

- `channels.mattermost-pro.enabled` is `true`
- `baseUrl` points to the Mattermost server base URL, not `/api/v4`
- the bot token is valid
- `groupPolicy` and `groupAllowFrom` allow the sender in channels
- channel posts mention the bot unless your `chatmode` allows broader triggering

### Internal Mattermost URL is blocked

Set:

```json5
{
  channels: {
    "mattermost-pro": {
      network: {
        dangerouslyAllowPrivateNetwork: true
      }
    }
  }
}
```

### Official Mattermost Plugin Conflict

This plugin does not use `channels.mattermost`. It owns:

```text
plugins.entries.mattermost-pro
channels.mattermost-pro
```

Keep the official plugin configured under `channels.mattermost` if you still use it.

## Repository Hygiene

Before publishing to GitHub, do not commit local install artifacts such as:

```text
node_modules/
.DS_Store
1/
```

Keep `dist/` only if you want GitHub users to be able to link/install without building first. If you do not commit `dist/`, users must run `pnpm build` before `openclaw plugins install --link`.

## License

MIT License. See [LICENSE](LICENSE).

---

# 中文说明

`mattermost-pro` 是一个从官方 Mattermost 插件派生出来的私用 OpenClaw channel 插件。它保留 Mattermost 连接能力，但针对个人使用场景修改了流式预览、thread 回复和独立安装方式。

它使用独立的 plugin id 和 channel id，因此可以和官方 `mattermost` 插件同时安装，不会接管 `channels.mattermost`。

## 和官方 Mattermost 插件的区别

| 项目 | 官方插件 | `mattermost-pro` |
| --- | --- | --- |
| Plugin id | `mattermost` / `@openclaw/mattermost` | `mattermost-pro` |
| Channel 配置路径 | `channels.mattermost` | `channels.mattermost-pro` |
| 消息 target 前缀 | `mattermost:` 风格 | `mattermost-pro:` 和 `mm-pro:` |
| 默认单条文本分块限制 | 官方插件行为 | `14000`，给 Mattermost 服务端单条限制留余量 |
| `streaming: "block"` | 跟随官方 channel 实现 | 保留完整过程状态，持续追加到同一条 draft 预览消息底部，最终回答另发一条普通消息 |
| 已有 thread 回复 | 取决于官方版本行为 | 用户在已有 Mattermost thread 里回复时，机器人继续在该 thread 中回复 |
| 顶层消息是否开新 thread | 由官方配置控制 | 只有 `replyToMode` 为 `first`、`all` 或 `batched` 时才主动开新 thread；`off` 只继承已有 thread |
| 分发方式 | 官方 OpenClaw 插件 | 私用独立源码包，通过 `pnpm build` 编译后用 `openclaw plugins install --link` 安装 |

如果你只想改自己的 Mattermost 使用体验，不想修改官方插件或 `channels.mattermost` 配置面，使用这个插件。

## 环境要求

- Node.js 22 或更新版本
- pnpm
- OpenClaw `2026.5.26` 或更新版本
- Mattermost bot token
- Mattermost 服务器 base URL，例如 `https://chat.example.com`

## 从源码安装

进入本仓库目录，安装依赖并编译：

```bash
pnpm install
pnpm build
```

确认生成了运行时入口：

```bash
ls dist/index.mjs dist/setup-entry.mjs dist/runtime-api.mjs
```

链接安装到 OpenClaw：

```bash
openclaw plugins install --link "$(pwd)"
```

安装或重新编译后重启 gateway：

```bash
openclaw gateway restart
```

开发时，改完源码后重新编译并重启：

```bash
pnpm build
openclaw gateway restart
```

## 配置

使用 `channels.mattermost-pro`，不要写到 `channels.mattermost`。

最小配置：

```json5
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
```

用 OpenClaw 写入配置：

```bash
openclaw config patch --stdin <<'EOF'
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
EOF
```

默认账号也可以使用环境变量：

```bash
export MATTERMOST_BOT_TOKEN="<MATTERMOST_BOT_TOKEN>"
export MATTERMOST_URL="https://chat.example.com"
```

## 推荐私用配置

这个 fork 主要面向下面这种配置：

```json5
{
  channels: {
    "mattermost-pro": {
      enabled: true,
      baseUrl: "https://chat.example.com",
      botToken: "<MATTERMOST_BOT_TOKEN>",

      streaming: "block",
      replyToMode: "off",
      textChunkLimit: 14000,

      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      groupAllowFrom: ["<mattermost-user-id>"]
    }
  }
}
```

行为说明：

- `streaming: "block"`：任务运行时编辑同一条 draft 预览消息，把最新过程状态追加到底部，保留完整过程历史；最终回答另发一条普通消息。
- `replyToMode: "off"`：顶层 channel 消息不会主动开新 thread。
- 如果用户输入本身已经在 Mattermost thread 里，机器人会继续在该 thread 回复。
- DM 不受 `replyToMode` 影响。

## 内网 Mattermost

如果 Mattermost 部署在内网或私有网络，需要显式开启：

```json5
{
  channels: {
    "mattermost-pro": {
      network: {
        dangerouslyAllowPrivateNetwork: true
      }
    }
  }
}
```

只对你自己控制并信任的 Mattermost 主机开启这个选项。

## 多账号配置

多个 Mattermost bot 可以放在 `accounts` 下：

```json5
{
  channels: {
    "mattermost-pro": {
      defaultAccount: "default",
      accounts: {
        default: {
          name: "Primary",
          baseUrl: "https://chat.example.com",
          botToken: "<PRIMARY_BOT_TOKEN>",
          streaming: "block",
          replyToMode: "off"
        },
        alerts: {
          name: "Alerts",
          baseUrl: "https://alerts.example.com",
          botToken: "<ALERTS_BOT_TOKEN>",
          streaming: "progress"
        }
      }
    }
  }
}
```

环境变量只作用于 `default` 账号。

## Native Slash Commands

原生 slash commands 是可选功能：

```json5
{
  channels: {
    "mattermost-pro": {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost-pro/command",
        callbackUrl: "https://gateway.example.com/api/channels/mattermost-pro/command"
      }
    }
  }
}
```

`callbackUrl` 必须能被 Mattermost 服务器访问。除非 Mattermost 和 OpenClaw 在同一个网络命名空间里，否则不要使用 `localhost`。

## 发送消息

使用新的 channel id：

```bash
openclaw message send --channel mattermost-pro --target channel:<channel-id> --text "hello"
```

OpenClaw 支持 target 字符串的位置，也可以使用这些前缀：

```text
mattermost-pro:channel:<channel-id>
mm-pro:channel:<channel-id>
mattermost-pro:<user-id>
```

## 常见问题

### `requires compiled runtime output`

先编译插件：

```bash
pnpm build
ls dist/index.mjs dist/setup-entry.mjs
```

然后重新安装或重新链接：

```bash
openclaw plugins install --link "$(pwd)"
openclaw gateway restart
```

### 收不到消息

先检查：

```bash
openclaw plugins list
openclaw config get channels.mattermost-pro
openclaw channels status --probe
```

确认：

- `channels.mattermost-pro.enabled` 是 `true`
- `baseUrl` 是 Mattermost 服务器 base URL，不要带 `/api/v4`
- bot token 有效
- channel 里发送者被 `groupPolicy` 和 `groupAllowFrom` 放行
- 如果 `chatmode` 没有放宽触发方式，channel 消息需要 @mention bot

### 内网 Mattermost URL 被拦截

配置：

```json5
{
  channels: {
    "mattermost-pro": {
      network: {
        dangerouslyAllowPrivateNetwork: true
      }
    }
  }
}
```

### 和官方 Mattermost 插件冲突吗？

不冲突。这个插件不使用 `channels.mattermost`，它拥有：

```text
plugins.entries.mattermost-pro
channels.mattermost-pro
```

如果还在使用官方插件，继续把官方插件配置放在 `channels.mattermost`。

## 发布到 GitHub 前

不要提交本地安装产物：

```text
node_modules/
.DS_Store
1/
```

是否提交 `dist/` 取决于你的分发方式：

- 提交 `dist/`：别人 clone 后可以直接 `openclaw plugins install --link "$(pwd)"`。
- 不提交 `dist/`：别人必须先运行 `pnpm build`，再安装。

## License

MIT License。见 [LICENSE](LICENSE)。
