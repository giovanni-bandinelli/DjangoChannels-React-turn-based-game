import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";
import "./index.css";

// the amber already means "your move" on the board and "the server is talking"
// in the chat: making it the primary colour keeps the whole app on one accent
// instead of MUI's default blue, which fights with the cornflower of the grid
const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#242424" },
    primary: { main: "#ffca28", contrastText: "#1b1b21" },
  },
  // MUI asks for Roboto, which this project does not load: without this the
  // components would silently fall back to whatever the device happens to have
  typography: {
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
