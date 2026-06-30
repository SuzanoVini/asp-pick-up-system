import { downloadRoutePdf } from "../route-export-download";

describe("downloadRoutePdf", () => {
	it("exports the route and triggers a named browser download", async () => {
		const exportRoute = jest.fn().mockResolvedValue({
			buffer: [80, 68, 70],
			filename: "route.pdf",
			contentType: "application/pdf",
		});
		const click = jest.fn();
		const anchor = { href: "", download: "", click };
		const documentRef = { createElement: jest.fn().mockReturnValue(anchor) };
		const createObjectURL = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:route");
		const revokeObjectURL = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

		await downloadRoutePdf("route-1", exportRoute, documentRef);

		expect(exportRoute).toHaveBeenCalledWith("route-1");
		expect(anchor).toMatchObject({ href: "blob:route", download: "route.pdf" });
		expect(click).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:route");
		createObjectURL.mockRestore();
		revokeObjectURL.mockRestore();
	});
});
