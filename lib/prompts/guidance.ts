/** Shared guidance for generated apps that persist through window.atomslite.db. */
export function atomsliteDbGuidance(): string {
  return [
    "跨刷新要保留的数据，用平台注入的 window.atomslite.db，四个方法都返回 Promise：",
    'list("集合名")、insert("集合名", doc)、update("集合名", id, patch)、remove("集合名", id)。',
    "第一个参数必须是非空的集合名字符串，例如 list(\"notes\")，不要写成 list()，也不要把对象直接传给 insert。",
    "页面加载先 list，写入成功后再改界面。不要覆盖 window.atomslite.db，也不要再实现一套假数据库。",
  ].join("");
}

export function interactionGuidance(): string {
  return [
    "分步交互时，进入下一步输入前要清掉上一步留在当前输入里的值，不要把新输入接到旧值后面。",
    "每个脚本只做自己的职责；不要在多个文件里各自再绑一整套相同的界面事件。",
    "index.html 必须用 <script src> 按依赖顺序引入本应用的全部 .js 文件，用 <link> 引入全部样式；漏掉任何一个脚本，页面都会点不动。",
  ].join("");
}
