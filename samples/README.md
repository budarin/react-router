# Примеры использования @budarin/react-router

Папка с примерами кода по фичам роутера. Каждый файл — один сценарий, можно копировать в свой проект.

| Файл                      | Что показано                                      |
| ------------------------- | ------------------------------------------------- |
| `01-basic-navigation.tsx` | pathname, navigate()                              |
| `02-params.tsx`           | useRouter('/users/:id'), params                   |
| `03-search-params.tsx`    | searchParams.get(), навигация с query             |
| `04-history.tsx`          | back, forward, go(delta), canGoBack, canGoForward |
| `05-push-replace.tsx`     | navigate(..., { history: 'push' \| 'replace' })   |
| `06-matched.tsx`          | matched — совпадение pathname с pattern           |

Импорт: `import { useRouter } from '@budarin/react-router';`
