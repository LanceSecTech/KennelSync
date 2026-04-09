import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Dog, Calendar, CheckCircle2, Sparkles, Home, Sun, CreditCard, Clock, Plus } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

type Step = "dogs" | "service" | "dates" | "addons" | "review";

const serviceIcons: Record<string, React.ElementType> = {
  boarding: Home,
  daycare: Sun,
  grooming: Sparkles,
};

export default function BookingFlow() {
  const [, setLocation] = useLocation();
  const { data: dogs } = trpc.dog.myDogs.useQuery();
  const { activeKennelId } = useKennel();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>("dogs");
  const [selectedDogs, setSelectedDogs] = useState<number[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const selectedKennelId = activeKennelId;
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "pay_later">("pay_later");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<number[]>([]);

  // Auto-select dog if only one
  useEffect(() => {
    if (dogs && dogs.length === 1 && selectedDogs.length === 0) {
      setSelectedDogs([dogs[0].id]);
      setStep("service");
    }
  }, [dogs, selectedDogs.length]);

  const { data: services } = trpc.service.byKennel.useQuery(
    { kennelId: selectedKennelId! },
    { enabled: !!selectedKennelId }
  );

  const { data: availableAddOns } = trpc.addOn.activeByKennel.useQuery(
    { kennelId: selectedKennelId! },
    { enabled: !!selectedKennelId }
  );

  const selectedService = services?.find(s => s.id === selectedServiceId);

  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to Stripe checkout...");
        window.open(data.url, '_blank');
        setLocation("/stays");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to create checkout"),
  });

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      utils.booking.myBookings.invalidate();
      utils.stats.customerDashboard.invalidate();
      if (paymentOption === 'pay_now' && data.id) {
        createCheckout.mutate({ bookingId: data.id, origin: window.location.origin });
      } else {
        toast.success("Booking submitted!");
        setLocation("/stays");
      }
    },
    onError: () => toast.error("Failed to create booking"),
  });

  const addOnsTotal = useMemo(() => {
    if (!availableAddOns || selectedAddOnIds.length === 0) return 0;
    return selectedAddOnIds.reduce((sum, id) => {
      const addOn = availableAddOns.find(a => a.id === id);
      return sum + (addOn ? parseFloat(String(addOn.price)) * selectedDogs.length : 0);
    }, 0);
  }, [availableAddOns, selectedAddOnIds, selectedDogs.length]);

  const servicePrice = useMemo(() => {
    if (!selectedService || !checkInDate) return 0;
    const price = parseFloat(String(selectedService.pricePerUnit));
    if (selectedService.type === "boarding" && checkOutDate) {
      const days = Math.max(1, Math.ceil((new Date(checkOutDate + 'T00:00:00').getTime() - new Date(checkInDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)));
      return price * days * selectedDogs.length;
    }
    return price * selectedDogs.length;
  }, [selectedService, checkInDate, checkOutDate, selectedDogs.length]);

  const totalPrice = servicePrice + addOnsTotal;

  const handleSubmit = () => {
    if (!selectedKennelId || !selectedServiceId || !checkInDate) return;
    createBooking.mutate({
      kennelId: selectedKennelId,
      dogIds: selectedDogs,
      serviceId: selectedServiceId,
      checkInDate,
      checkOutDate: checkOutDate || undefined,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      addOnIds: selectedAddOnIds.length > 0 ? selectedAddOnIds : undefined,
    });
  };

  const toggleAddOn = (id: number) => {
    setSelectedAddOnIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    switch (step) {
      case "dogs": return selectedDogs.length > 0;
      case "service": return selectedServiceId !== null;
      case "dates": return !!checkInDate && (selectedService?.type !== "boarding" || !!checkOutDate);
      case "addons": return true; // add-ons are optional
      case "review": return true;
    }
  };

  const allSteps: Step[] = ["dogs", "service", "dates", "addons", "review"];
  const stepLabels = ["Dogs", "Service", "Dates", "Extras", "Review"];

  const nextStep = () => {
    const idx = allSteps.indexOf(step);
    if (idx < allSteps.length - 1) {
      // Skip add-ons step if no add-ons available
      if (allSteps[idx + 1] === "addons" && (!availableAddOns || availableAddOns.length === 0)) {
        setStep("review");
      } else {
        setStep(allSteps[idx + 1]);
      }
    }
  };

  const prevStep = () => {
    const idx = allSteps.indexOf(step);
    if (idx > 0) {
      // Skip add-ons step going back if no add-ons available
      if (allSteps[idx - 1] === "addons" && (!availableAddOns || availableAddOns.length === 0)) {
        setStep("dates");
      } else {
        setStep(allSteps[idx - 1]);
      }
    }
  };

  const stepIndex = allSteps.indexOf(step);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => stepIndex === 0 ? setLocation("/") : prevStep()} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">New Booking</h1>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
            <p className={`text-[10px] mt-1 text-center ${i <= stepIndex ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Step: Select Dogs */}
      {step === "dogs" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select which dogs to book (you can select multiple)</p>
          {dogs?.map(dog => (
            <Card
              key={dog.id}
              className={`cursor-pointer transition-all border-2 ${selectedDogs.includes(dog.id) ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
              onClick={() => setSelectedDogs(prev =>
                prev.includes(dog.id) ? prev.filter(id => id !== dog.id) : [...prev, dog.id]
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Checkbox checked={selectedDogs.includes(dog.id)} className="pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{dog.name}</p>
                  <p className="text-xs text-muted-foreground">{dog.breed || "No breed"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!dogs || dogs.length === 0) && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Add a dog first to make a booking</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setLocation("/dogs")}>
                  Add Dog
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step: Select Service */}
      {step === "service" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose a service</p>
          {services?.map(service => {
            const Icon = serviceIcons[service.type] || Sun;
            return (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all border-2 ${selectedServiceId === service.id ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
                onClick={() => setSelectedServiceId(service.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description || service.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">${String(service.pricePerUnit)}</p>
                    <p className="text-[10px] text-muted-foreground">{service.unitType?.replace("_", " ")}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!services || services.length === 0) && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No services available at this kennel</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step: Select Dates */}
      {step === "dates" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {selectedService?.type === "boarding" ? "Select check-in and check-out dates" : "Select service date"}
          </p>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {selectedService?.type === "boarding" ? "Check-in Date" : "Service Date"}
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={e => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background"
                />
              </div>
              {selectedService?.type === "boarding" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Check-out Date</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    min={checkInDate || new Date().toISOString().split("T")[0]}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Add-Ons */}
      {step === "addons" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add optional extras to your booking (per dog)
          </p>
          {availableAddOns && availableAddOns.length > 0 ? (
            <>
              {availableAddOns.map(addOn => {
                const isSelected = selectedAddOnIds.includes(addOn.id);
                const perDogPrice = parseFloat(String(addOn.price));
                const totalForAddOn = perDogPrice * selectedDogs.length;
                return (
                  <Card
                    key={addOn.id}
                    className={`cursor-pointer transition-all border-2 ${isSelected ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
                    onClick={() => toggleAddOn(addOn.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{addOn.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${perDogPrice.toFixed(2)} per dog
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">${totalForAddOn.toFixed(2)}</p>
                        {selectedDogs.length > 1 && (
                          <p className="text-[10px] text-muted-foreground">{selectedDogs.length} dogs</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {selectedAddOnIds.length > 0 && (
                <Card className="border-0 shadow-sm bg-amber-50/50">
                  <CardContent className="p-3 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Add-ons subtotal</span>
                    <span className="text-sm font-semibold text-primary">+${addOnsTotal.toFixed(2)}</span>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground text-center">
                These are optional — skip if you don't need any extras
              </p>
            </>
          ) : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No add-ons available at this kennel</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Review your booking</p>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dogs</span>
                <span className="font-medium">{selectedDogs.map(id => dogs?.find(d => d.id === id)?.name).join(", ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{selectedService?.type === "boarding" ? "Check-in" : "Date"}</span>
                <span className="font-medium">{checkInDate ? new Date(checkInDate + 'T00:00:00').toLocaleDateString() : "—"}</span>
              </div>
              {checkOutDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{new Date(checkOutDate + 'T00:00:00').toLocaleDateString()}</span>
                </div>
              )}
              {notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-right max-w-[60%]">{notes}</span>
                </div>
              )}

              {/* Service price */}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">${servicePrice.toFixed(2)}</span>
              </div>

              {/* Add-ons breakdown */}
              {selectedAddOnIds.length > 0 && availableAddOns && (
                <>
                  {selectedAddOnIds.map(addOnId => {
                    const addOn = availableAddOns.find(a => a.id === addOnId);
                    if (!addOn) return null;
                    const perDogPrice = parseFloat(String(addOn.price));
                    const total = perDogPrice * selectedDogs.length;
                    return (
                      <div key={addOnId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          {addOn.name}
                          {selectedDogs.length > 1 && <span className="text-[10px]">x{selectedDogs.length}</span>}
                        </span>
                        <span className="font-medium">+${total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Option */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payment Option</p>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-all border-2 ${paymentOption === "pay_now" ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
                onClick={() => setPaymentOption("pay_now")}
              >
                <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                  <CreditCard className={`h-6 w-6 ${paymentOption === "pay_now" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Pay Now</p>
                    <p className="text-[10px] text-muted-foreground">Pay the full amount today</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all border-2 ${paymentOption === "pay_later" ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
                onClick={() => setPaymentOption("pay_later")}
              >
                <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                  <Clock className={`h-6 w-6 ${paymentOption === "pay_later" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Pay Later</p>
                    <p className="text-[10px] text-muted-foreground">Pay at check-in or after</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        {step !== "review" ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-12 text-base font-semibold gap-2"
          >
            {step === "addons" ? (selectedAddOnIds.length > 0 ? "Continue with Extras" : "Skip Extras") : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="flex-1 h-12 text-base font-semibold gap-2"
          >
            {(createBooking.isPending || createCheckout.isPending) ? "Processing..." : (paymentOption === "pay_now" ? "Pay & Submit" : "Submit Booking")}
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
