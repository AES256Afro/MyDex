self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|icon\\.png|icon\\.svg|apple-icon\\.png|manifest\\.json|sitemap\\.xml|robots\\.txt|images|screenshots\\/).*))(\\\\.json)?[\\/#\\?]?$",
    "originalSource": "/((?!_next/static|_next/image|favicon.ico|icon\\.png|icon\\.svg|apple-icon\\.png|manifest\\.json|sitemap\\.xml|robots\\.txt|images|screenshots/).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()