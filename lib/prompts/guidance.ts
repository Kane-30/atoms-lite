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
  ].join("");
}

export function fileListGuidance(allowedPaths: string[]): string {
  const list = allowedPaths.join("、");
  const cssJs = allowedPaths.filter((path) => /\.(css|js)$/i.test(path));
  return [
    `本轮只允许写这些路径：${list}。不要创建列表外的文件，也不要在 HTML 里引用列表外的路径。`,
    cssJs.length > 0
      ? `写 index.html 时，link/script 只能引用本轮列表里的 css/js，并且必须全部引用：${cssJs.join("、")}。`
      : "写 index.html 时不要引用尚未列入本轮清单的 css/js。",
  ].join("");
}
