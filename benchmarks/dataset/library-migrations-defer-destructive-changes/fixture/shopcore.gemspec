require_relative "lib/shopcore/version"

Gem::Specification.new do |spec|
  spec.name = "shopcore"
  spec.version = Shopcore::VERSION
  spec.authors = ["Brambleway platform team"]
  spec.summary = "Address books, products and orders for Rails stores."
  spec.homepage = "https://github.com/brambleway/shopcore"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 2.7"

  spec.files = Dir["{app,db,lib}/**/*", "README.md", "CHANGELOG.md"]

  spec.metadata["source_code_uri"] = spec.homepage

  spec.add_dependency "rails", ">= 7.1"
end
