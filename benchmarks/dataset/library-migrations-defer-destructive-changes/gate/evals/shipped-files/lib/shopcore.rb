require "shopcore/version"
require "shopcore/money"
require "shopcore/address_label"

module Shopcore
  def self.deprecator
    @deprecator ||= ActiveSupport::Deprecation.new("4.0", "Shopcore")
  end

  if defined?(Rails::Engine)
    class Engine < ::Rails::Engine
      isolate_namespace Shopcore

      initializer "shopcore.deprecator" do |app|
        app.deprecators[:shopcore] = Shopcore.deprecator
      end
    end
  end
end
