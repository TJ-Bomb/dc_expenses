export function errorMessage(error:unknown){return error instanceof Error?error.message:'Unexpected server error';}
export function jsonError(error:unknown,status=400){return Response.json({error:errorMessage(error)},{status});}
