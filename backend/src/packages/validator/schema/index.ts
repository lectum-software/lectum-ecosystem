import conditions from "./_internal/conditions";
import { preFire } from "./_internal/fines/prefine";
import { refinesServer } from "./_internal/fines/refines";
import { handleError } from "./_internal/handlers/error";
import { f } from "./_internal/validations";

const schema = {
  f,
  preFire,
  handleError,
  conditions,
  refinesServer,
};

export default schema;
