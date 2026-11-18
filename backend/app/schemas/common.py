from pydantic import StringConstraints
from typing_extensions import Annotated

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
