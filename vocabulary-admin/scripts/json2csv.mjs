import fs from "node:fs"
import path from "node:path"

const inputPath = "d:\\虚拟C盘\\workspace\\ai-coding\\memorize-vocabulary\\vocabulary-admin\\temp\\PEPXiaoXue3_2.json"
const outputPath = inputPath.replace(/\.json$/i, ".csv")

/**
 * 将一个值转换为 CSV 单元格，并转义其中的双引号、逗号和换行。
 * @param {unknown} value 要转换的值
 * @returns {string} 可安全写入 CSV 的单元格文本
 */
function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

/**
 * 读取输入文件中的 JSON 数据。
 * 支持标准 JSON 数组、单个 JSON 对象，以及多个连续的格式化 JSON 对象。
 * @param {string} filePath JSON 文件路径
 * @returns {Array<Record<string, unknown>>} 单词对象数组
 */
function readJsonObjects(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim()

  if (!text) {
    return []
  }

  try {
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : [data]
  } catch {
    const objects = []
    let start = -1
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (character === "\\") {
          escaped = true
        } else if (character === '"') {
          inString = false
        }
        continue
      }

      if (character === '"') {
        inString = true
      } else if (character === "{") {
        if (depth === 0) {
          start = index
        }
        depth += 1
      } else if (character === "}") {
        depth -= 1

        if (depth === 0 && start !== -1) {
          objects.push(JSON.parse(text.slice(start, index + 1)))
          start = -1
        }
      }
    }

    if (depth !== 0 || objects.length === 0) {
      throw new Error("文件不是有效的 JSON 数组、JSON 对象或连续 JSON 对象")
    }

    return objects
  }
}

/**
 * 将单词对象整理为 CSV 文本，并把 content 保存为一个 JSON 字符串字段。
 * @param {Array<Record<string, unknown>>} words 单词对象数组
 * @returns {string} CSV 文本
 */
function buildCsv(words) {
  const headers = ["wordRank", "headWord", "content", "bookId"]
  const rows = words.map((word) => [
    word.wordRank,
    word.headWord,
    JSON.stringify(word.content ?? {}),
    word.bookId,
  ])

  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n") + "\n"
}

/**
 * 执行 JSON 到 CSV 的转换，并把 CSV 保存在 JSON 文件相同目录下。
 */
function convertJsonToCsv() {
  const words = readJsonObjects(inputPath)
  const csv = buildCsv(words)

  fs.writeFileSync(outputPath, "\uFEFF" + csv, "utf8")
  console.log(`转换完成：${words.length} 条数据`)
  console.log(`输出文件：${outputPath}`)
}

convertJsonToCsv()
