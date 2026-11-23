module MoneyFmt
  class Deprecator
    attr_accessor :silenced

    def initialize(output = $stderr)
      @output = output
      @silenced = false
    end

    def warn(message)
      return if silenced

      @output.puts("DEPRECATION WARNING: #{message} (called from #{caller_locations(2, 1).first})")
    end
  end

  def self.deprecator
    @deprecator ||= Deprecator.new
  end

  def self.deprecator=(deprecator)
    @deprecator = deprecator
  end
end
