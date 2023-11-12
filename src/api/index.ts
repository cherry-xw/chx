import { ServeCreator } from "./request";

const serverURL = import.meta.env.VITE_SERVER_CONFIG + "/api"

const serve = ServeCreator(serverURL, "POST");

export default serve;
