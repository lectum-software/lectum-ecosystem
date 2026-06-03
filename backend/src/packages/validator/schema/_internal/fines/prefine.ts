//@ts-nocheck

export const preFire = (data, req) => {
  const formattedQuery = data.query;
  const formattedParams = data.params;
  const formattedBody = data.body;

  const relations = data.relations;

  const mapRelations = (items, formatted) => {
    return items?.map((item) => {
      const keys = item.keys.map((key) => {
        const defined = formatted.find((query) => query.key === key);
        return defined;
      });

      return {
        keys,
        type: item.type,
      };
    });
  };

  //Query
  const queryRelation = mapRelations(relations?.query || [], formattedQuery);
  const paramsRelation = mapRelations(relations?.params || [], formattedParams);
  const bodyRelation = mapRelations(relations?.body || [], formattedBody);

  return {
    queryF: formattedQuery || [],
    paramsF: formattedParams || [],
    bodyF: formattedBody || [],
    queryRelation,
    paramsRelation,
    bodyRelation,
  };
};
