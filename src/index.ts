import Koa from "koa";
import qs, { IParseOptions, ParsedQs } from "qs";
import merge from "merge-descriptors";

type MergeMode = "extended" | "strict" | "first";
type BaseRequestOverride = {
  query: ParsedQs;
  querystring?: string;
  _querycache?: Record<string, ParsedQs>;
};

export const koaqs = function (
  app: Koa,
  mode: MergeMode,
  options?: IParseOptions,
) {
  mode = mode || "extended";
  // const qs = mode === "extended" ? require("qs") : require("querystring");

  const converter =
    (mode === "strict" &&
      function (value: undefined | string | string[] | ParsedQs | ParsedQs[]) {
        if (typeof value === "undefined") return undefined;
        if (typeof value === "string")
          return !Array.isArray(value) ? [value] : value;
        return !Array.isArray(value) ? [value] : value;
      }) ||
    (mode === "first" &&
      function (value: undefined | string | string[] | ParsedQs | ParsedQs[]) {
        return Array.isArray(value) ? value[0] : value;
      });

  merge<Koa.BaseRequest, BaseRequestOverride>(app.request, {
    /**
     * Get parsed query-string.
     *
     * @api public
     */
    get query() {
      const str = this.querystring;
      if (!str) return {};

      const c = (this._querycache = this._querycache || {});
      let query: ParsedQs = c[str];
      if (!query) {
        c[str] = query = qs.parse(str, { ...options, decoder: undefined });
        if (converter) {
          for (const key in query) {
            if (query[key] == undefined) continue;
            query[key] = converter(query[key]);
          }
        }
      }
      return query;
    },

    /**
     * Set query-string as an object.
     *
     * @api public
     */
    set query(obj: Record<string, any>) {
      this.querystring = qs.stringify(obj);
    },
  } as BaseRequestOverride);

  return app;
};
