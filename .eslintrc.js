module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 13
  },
  "rules": {
    // 只允许缩进两格空格
    // 更多相关配置https://blog.csdn.net/pengjunlee/article/details/97750755
    indent: ["warn", 2, { SwitchCase: 1, MemberExpression: 1, flatTernaryExpressions: true }],
    quotes: ["off", "double"],
    // 强制使用三等号
    eqeqeq: ["error", "smart"],
    // 允许空catch函数
    "no-empty": ["error", { allowEmptyCatch: true }],
    // 禁用var变量声明
    "no-var": "warn",
    // 强制分号结尾
    "semi": ["error", "always"],
    // 箭头函数根据需要添加参数括号
    "arrow-parens": ["error", "as-needed"],
    // 一行最后不允许有空格
    "no-trailing-spaces": "error",
    // 构造函数名字首字母要大写
    "new-cap": ["error", { newIsCap: true, capIsNew: false }],
    // 不允许label语句
    "no-labels": [
      "error",
      {
        allowLoop: false,
        allowSwitch: false
      }
    ],
    "no-unused-vars": [
      "error",
      {
        // 检查所有变量的使用情况，包括全局范围内的变量
        vars: "all",
        // 该varsIgnorePattern选项指定不检查使用情况的例外：名称与正则表达式模式匹配的变量。例如，名称以下划线开头的变量
        varsIgnorePattern: "^_|that|scope",
        // 不会检查在最后使用的参数之前出现的未使用的位置参数，但是将检查所有已命名的参数以及在最后使用的参数之后的所有位置参数。
        // args: "after-used",
        // 禁用所有参数是否使用检查
        args: "none",
        // 该argsIgnorePattern选项指定不检查使用情况的例外：名称与正则表达式模式匹配的参数。如，名称以下划线开头的变量
        argsIgnorePattern: "^_",
        // 使用Rest属性可以从对象中“忽略”属性
        ignoreRestSiblings: false
      }
    ],
  }
};
