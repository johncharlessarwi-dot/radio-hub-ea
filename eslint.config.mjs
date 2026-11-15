import tseslint from "typescript-eslint";
export default tseslint.config({ignores:["**/dist/**","**/android/**"]},...tseslint.configs.recommended);
