require_relative "lib/money_fmt/version"

Gem::Specification.new do |spec|
  spec.name = "money_fmt"
  spec.version = MoneyFmt::VERSION
  spec.authors = ["Larkspur Books payments team"]
  spec.summary = "Formats and parses money amounts."
  spec.homepage = "https://git.larkspur-books.example/payments/money_fmt"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.files = Dir["lib/**/*.rb", "README.md", "CHANGELOG.md"]
  spec.require_paths = ["lib"]
end
