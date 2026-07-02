import reactQuestions from "./q-react";
import jsQuestions from "./q-js";
import phpQuestions from "./q-php";
import htmlQuestions from "./q-html";
import securityQuestions from "./q-security";
import devopsQuestions from "./q-devops";
import mysqlQuestions from "./q-mysql";
import nosqlQuestions from "./q-nosql";
import umlQuestions from "./q-uml";
import wordpressQuestions from "./q-wordpress";
import archQuestions from "./q-arch";

export const categories = [
  "React",
  "JavaScript",
  "PHP",
  "HTML/CSS/SCSS",
  "Sécurité Web",
  "DevOps",
  "MySQL",
  "NoSQL",
  "UML/Diagrammes",
  "WordPress",
  "Architecture Web",
] as const;

export type Category = (typeof categories)[number];

export type Question = {
  id: number;
  category: Category;
  difficulty: "débutant" | "intermédiaire" | "avancé";
  question: string;
  answer: string;
  options: [string, string, string, string];
  correctIndex: 0;
};

export const categoryLabels: Record<Category, string> = {
  React: "⚛️ React",
  JavaScript: "🟨 JavaScript",
  PHP: "🐘 PHP",
  "HTML/CSS/SCSS": "🎨 HTML/CSS/SCSS",
  "Sécurité Web": "🔒 Sécurité Web",
  DevOps: "🚀 DevOps",
  MySQL: "🗄️ MySQL",
  NoSQL: "🍃 NoSQL",
  "UML/Diagrammes": "📐 UML",
  WordPress: "🔵 WordPress",
  "Architecture Web": "🏗️ Architecture",
};

export const categoryColors: Record<Category, string> = {
  React: "bg-blue-100 text-blue-800 border-blue-200",
  JavaScript: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PHP: "bg-purple-100 text-purple-800 border-purple-200",
  "HTML/CSS/SCSS": "bg-pink-100 text-pink-800 border-pink-200",
  "Sécurité Web": "bg-red-100 text-red-800 border-red-200",
  DevOps: "bg-orange-100 text-orange-800 border-orange-200",
  MySQL: "bg-cyan-100 text-cyan-800 border-cyan-200",
  NoSQL: "bg-green-100 text-green-800 border-green-200",
  "UML/Diagrammes": "bg-indigo-100 text-indigo-800 border-indigo-200",
  WordPress: "bg-sky-100 text-sky-800 border-sky-200",
  "Architecture Web": "bg-teal-100 text-teal-800 border-teal-200",
};

export const questions: Question[] = [
  ...reactQuestions,
  ...jsQuestions,
  ...phpQuestions,
  ...htmlQuestions,
  ...securityQuestions,
  ...devopsQuestions,
  ...mysqlQuestions,
  ...nosqlQuestions,
  ...umlQuestions,
  ...wordpressQuestions,
  ...archQuestions,
];
